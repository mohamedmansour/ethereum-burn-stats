package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	gethRPC "github.com/ethereum/go-ethereum/rpc"
	"github.com/gorilla/websocket"
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"
	"github.com/sirupsen/logrus"
)

var log = logrus.StandardLogger()

var allowedEthSubscriptions = map[string]bool{
	"newHeads":   true,
	"blockStats": true,
}

type BlockStatsMap struct {
	mu sync.Mutex
	v  map[uint64]sql.BlockStats
}

type BlockCounter struct {
	mu sync.Mutex
	v  map[uint64]int64
}

var londonBlock = uint64(12_965_000)
var constantinopleBlock = uint64(7_280_000)
var byzantiumBlock = uint64(4_370_000)

var globalBlockStats = BlockStatsMap{v: make(map[uint64]sql.BlockStats)}
var globalTotalBurned = BlockCounter{v: make(map[uint64]int64)}
var globalTotalTips = BlockCounter{v: make(map[uint64]int64)}

type Hub interface {
	ListenAndServe(addr string) error
}

// Hub maintains the set of active clients and subscriptions messages to the
// clients.
type hub struct {
	upgrader *websocket.Upgrader

	// Registered clients.
	clients map[*client]bool

	// Inbound messages from the clients.
	subscription chan map[string]interface{}

	// Register requests from the clients.
	register chan *client

	// Unregister requests from clients.
	unregister chan *client

	handlers map[string]func(c *client, message jsonrpcMessage) (json.RawMessage, error)
}

func New(
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
	dbPath string,
	initializedb bool,
	startingblock int,
	ropsten bool,
) (Hub, error) {
	upgrader := &websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
	}

	if development {
		upgrader.CheckOrigin = func(r *http.Request) bool {
			return true
		}
	}

	if ropsten {
		londonBlock = uint64(10_499_401)
		constantinopleBlock = uint64(4_230_000)
		byzantiumBlock = uint64(1_700_000)
	}

	subscription := make(chan map[string]interface{})
	clients := make(map[*client]bool)

	log.Infof("Initialize rpcClientHttp '%s'", gethEndpointHTTP)

	rpcClient := &rpcClient{
		endpoint:   gethEndpointHTTP,
		httpClient: new(http.Client),
	}

	log.Infof("Get latest block...")

	latestBlock := newLatestBlock()

	_, err := ethBlockNumber(
		rpcClient,
		latestBlock,
	)(
		nil,
		jsonrpcMessage{
			Version: "2.0",
			Method:  "eth_blockNumber",
			Params:  json.RawMessage([]byte("[]")),
		},
	)
	if err != nil {
		return nil, err
	}

	blockNumber := latestBlock.getBlockNumber()
	log.Infof("Latest block: %s", blockNumber.String())

	db, err := sql.ConnectDatabase(dbPath)
	if err != nil {
		return nil, err
	}

	if initializedb {
		highestBlock, err := db.GetHighestBlock()
		if err != nil {
			log.Errorf("Error %v\n", err)
			return nil, err
		}
		latestBlockNumber := blockNumber.Uint64()
		currentBlock := uint64(highestBlock) + uint64(1)
		if startingblock >= 0 && uint(startingblock) > highestBlock {
			currentBlock = uint64(startingblock)
		}

		counter := uint64(0)
		//for b := uint64(10499401); b <= blockNumber.Uint64(); b++ {

		for { //b := uint64(startingBlock); b <= blockNumber.Uint64(); b++ {
			counter++
			_, err := UpdateBlockStats(rpcClient, hexutil.EncodeUint64(uint64(currentBlock)))
			if err != nil {
				log.Errorf("Error %v\n", err)
				return nil, err
			}

			if counter == 100 || currentBlock == uint64(latestBlockNumber) {
				var batchStats []sql.BlockStats
				for counter > 0 {
					batchStats = append(batchStats, globalBlockStats.v[currentBlock+1-counter])
					counter--
				}
				db.AddBlocks(batchStats)
			}

			if currentBlock == uint64(latestBlockNumber) {
				_, err := ethBlockNumber(
					rpcClient,
					latestBlock,
				)(
					nil,
					jsonrpcMessage{
						Version: "2.0",
						Method:  "eth_blockNumber",
						Params:  json.RawMessage([]byte("[]")),
					},
				)
				if err != nil {
					return nil, err
				}

				blockNumber = latestBlock.getBlockNumber()
				log.Infof("Latest block: %s", blockNumber.String())
				latestBlockNumber = blockNumber.Uint64()
				if currentBlock == uint64(latestBlockNumber) {
					break
				}
			}
			currentBlock++
		}
	}

	log.Infof("Initialize gethRPCClientWebsocket '%s'", gethEndpointWebsocket)
	gethRPCClientWebsocket, err := gethRPC.Dial(gethEndpointWebsocket)
	if err != nil {
		return nil, err
	}

	headers := make(chan *types.Header)
	sub, err := gethRPCClientWebsocket.EthSubscribe(context.Background(), headers, "newHeads")
	if err != nil {
		return nil, err
	}

	go func(latestBlock *LatestBlock) {
		for {
			select {
			case err := <-sub.Err():
				log.Errorln("Error: ", err)
			case header := <-headers:
				blockStats, err := UpdateBlockStats(rpcClient, toBlockNumArg(header.Number))
				if err != nil {
					log.Errorf("Error getting block stats: %v\n", err)
				}
				db.AddBlock(blockStats)
				clientsCount := len(clients)
				//log.Infof("new block: %v, burned: %d, tips: %d, clients: %d", header.Number, blockBurned, blockTips, clientsCount)
				latestBlock.updateBlockNumber(header.Number)
				subscription <- map[string]interface{}{
					"newHeads":              header,
					"blockStats":            blockStats,
					"internal_clientsCount": clientsCount,
				}
			}
		}
	}(latestBlock)

	handlers := map[string]func(c *client, message jsonrpcMessage) (json.RawMessage, error){
		"debug_getBlockReward": handleFunc(rpcClient),
		"debug_burned":         handleFunc(rpcClient),

		"eth_blockNumber": ethBlockNumber(
			rpcClient,
			latestBlock,
		),
		"eth_chainId":  handleFunc(rpcClient),
		"eth_gasPrice": handleFunc(rpcClient),
		"eth_getBlockByNumber": ethGetBlockByNumber(
			rpcClient,
			latestBlock,
		),
		"eth_getTransactionByHash": handleFunc(rpcClient),
		"eth_syncing":              handleFunc(rpcClient),
		"eth_getBalance":           handleFunc(rpcClient),

		"internal_getBurned": getBurned(rpcClient),
		//"internal_getTips":   getTips(rpcClient),
		"internal_getBlockStats": getBlockStats(rpcClient),

		"eth_subscribe":   ethSubscribe(),
		"eth_unsubscribe": ethUnsubscribe(),
	}

	return &hub{
		upgrader: upgrader,

		subscription: subscription,
		register:     make(chan *client),
		unregister:   make(chan *client),
		clients:      clients,

		handlers: handlers,
	}, nil
}

func (h *hub) listen() {
	for {
		select {
		case client := <-h.register:
			h.clients[client] = true

		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
			}

		case subscriptionMessage := <-h.subscription:
			for subscription, message := range subscriptionMessage {

				for client := range h.clients {
					subscriptionID := client.isSubscribedTo(subscription)
					if subscriptionID == nil {
						continue
					}

					b, err := json.Marshal(
						map[string]interface{}{
							"subscription": toBlockNumArg(subscriptionID),
							"result":       message,
						},
					)
					if err != nil {
						log.Error(err)
						continue
					}

					var params json.RawMessage
					err = json.Unmarshal(b, &params)
					if err != nil {
						log.Error(err)
						continue
					}

					b, err = json.Marshal(
						jsonrpcMessage{
							Version: "2.0",
							Method:  "eth_subscription",
							Params:  params,
						},
					)
					if err != nil {
						log.Error(err)
						continue
					}

					select {
					case client.send <- b:
					default:
						close(client.send)
						delete(h.clients, client)
					}
				}
			}
		}
	}
}

func (h *hub) ListenAndServe(addr string) error {
	go h.listen()

	http.HandleFunc("/", h.serveWebSocket)

	err := http.ListenAndServe(addr, nil)
	if err != nil {
		return err
	}

	return nil
}

// ServeWebSocket handles websocket requests from the peer.
func (h *hub) serveWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := h.upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := NewClient(
		h,
		conn,
	)
	h.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

func handleFunc(
	rpcClient *rpcClient,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		raw, err := rpcClient.CallContext(
			message.Version,
			message.Method,
			params...,
		)
		if err != nil {
			return nil, err
		}

		return raw, nil
	}
}

func ethBlockNumber(
	rpcClient *rpcClient,
	latestBlock *LatestBlock,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		raw, err := rpcClient.CallContext(
			message.Version,
			message.Method,
			params...,
		)
		if err != nil {
			return nil, err
		}

		var hexBlockNumber string
		err = json.Unmarshal(raw, &hexBlockNumber)
		if err != nil {
			return nil, err
		}

		blockNumber, err := hexutil.DecodeBig(hexBlockNumber)
		if err != nil {
			return nil, err
		}

		latestBlock.updateBlockNumber(blockNumber)

		return raw, nil
	}
}

func ethGetBlockByNumber(
	rpcClient *rpcClient,
	latestBlock *LatestBlock,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		hexBlockNumber, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("blockNumber is not a string - %s", params[0])
		}

		blockNumber, err := hexutil.DecodeBig(hexBlockNumber)
		if err != nil {
			return nil, fmt.Errorf("blockNumber was not a hex - %s", hexBlockNumber)
		}

		if !latestBlock.lessEqualsLatestBlock(blockNumber) {
			return nil, fmt.Errorf("requested blockNumber is bigger than latest - r: %v, l: %v", blockNumber, latestBlock.blockNumber)
		}

		raw, err := rpcClient.CallContext(
			message.Version,
			message.Method,
			params...,
		)
		if err != nil {
			return nil, err
		}

		return raw, nil
	}
}

func ethSubscribe() func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		subscription, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("subscription name is not a string - %s", params[0])
		}

		if !allowedEthSubscriptions[subscription] {
			return nil, fmt.Errorf("subscription '%s' is not allowed", subscription)
		}

		subscrptionID, err := c.subscribeTo(subscription)
		if err != nil {
			return nil, err
		}

		return json.RawMessage(fmt.Sprintf("\"%s\"", toBlockNumArg(subscrptionID))), nil
	}
}

func ethUnsubscribe() func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		hexSubscriptionID, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("subscription name is not a string - %s", params[0])
		}

		subscriptionID, err := hexutil.DecodeBig(hexSubscriptionID)
		if err != nil {
			return nil, fmt.Errorf("subscription id was not a hex - %s", hexSubscriptionID)
		}
		subscrptionID, err := c.unsubscribeTo(subscriptionID)
		if err != nil {
			return nil, err
		}

		return json.RawMessage(fmt.Sprintf("\"%s\"", toBlockNumArg(subscrptionID))), nil
	}
}

func toBlockNumArg(number *big.Int) string {
	if number == nil {
		return "latest"
	}

	pending := big.NewInt(-1)
	if number.Cmp(pending) == 0 {
		return "pending"
	}

	return hexutil.EncodeBig(number)
}

func getBurned(
	rpcClient *rpcClient,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		var blockStartHex string

		blockStartHex, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("starting block is not a string - %v", params[0])
		}

		//blockEndHex = blockStartHex

		//if len(params) >= 2 {
		//	blockEndHex, ok = params[1].(string)
		//	if !ok {
		//		return nil, fmt.Errorf("starting block is not a string - %v", params[1])
		//	}
		//}

		blockNumber, err := hexutil.DecodeUint64(blockStartHex)
		if err != nil {
			return nil, err
		}

		//blockEnd, err := hexutil.DecodeUint64(blockEndHex)
		//if err != nil {
		//	return nil, err
		//}

		//burned := new(big.Int).SetInt64(0)

		var blockStats sql.BlockStats

		if blockStats, ok = globalBlockStats.v[blockNumber]; !ok {
			blockStats, err = UpdateBlockStats(rpcClient, hexutil.EncodeUint64(blockNumber))
			if err != nil {
				return nil, err
			}
		}

		burned, err := hexutil.DecodeBig(blockStats.Burned)
		if err != nil {
			return nil, err
		}

		return json.RawMessage(fmt.Sprintf("\"%s\"", hexutil.EncodeBig(burned))), nil
	}
}

func getBlockStats(
	rpcClient *rpcClient,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		var blockNumberHex string

		blockNumberHex, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("starting block is not a string - %v", params[0])
		}

		blockNumber, err := hexutil.DecodeUint64(blockNumberHex)
		if err != nil {
			return nil, err
		}

		var blockStats sql.BlockStats

		if blockStats, ok = globalBlockStats.v[blockNumber]; !ok {
			log.Printf("updating block stats for block #%d\n", blockNumber)
			blockStats, err = UpdateBlockStats(rpcClient, hexutil.EncodeUint64(blockNumber))
			if err != nil {
				return nil, err
			}
		}

		blockStatsJson, err := json.Marshal(blockStats)
		if err != nil {
			log.Errorf("Error marshaling block stats: %v\n", err)
		}

		return json.RawMessage(blockStatsJson), nil
	}
}

func UpdateBlockStats(rpcClient *rpcClient, blockNumberHex string) (sql.BlockStats, error) {
	start := time.Now()
	var blockStats sql.BlockStats
	var raw json.RawMessage
	raw, err := rpcClient.CallContext(
		"2.0",
		"eth_getBlockByNumber",
		blockNumberHex,
		false,
	)
	if err != nil {
		log.Printf("%v\n", err)
		return blockStats, err
	}

	block := Block{}
	err = json.Unmarshal(raw, &block)
	if err != nil {
		return blockStats, err
	}

	header := types.Header{}
	err = json.Unmarshal(raw, &header)
	if err != nil {
		return blockStats, err
	}

	blockNumber, err := hexutil.DecodeUint64(blockNumberHex)
	if err != nil {
		return blockStats, err
	}

	gasUsed, err := hexutil.DecodeBig(block.GasUsed)
	if err != nil {
		return blockStats, err
	}

	gasTarget, err := hexutil.DecodeBig(block.GasLimit)
	if err != nil {
		return blockStats, err
	}

	if blockNumber > londonBlock {
		gasTarget.Div(gasTarget, big.NewInt(2))
	}

	baseFee := big.NewInt(0)

	if block.BaseFeePerGas != "" {
		baseFee, err = hexutil.DecodeBig(block.BaseFeePerGas)
		if err != nil {
			return blockStats, err
		}
	}

	transactionCount := big.NewInt(int64(len(block.Transactions)))

	blockBurned := big.NewInt(0)
	blockTips := big.NewInt(0)

	blockReward := getBaseReward(blockNumber)

	for n, uncleHash := range block.Uncles {
		var raw json.RawMessage
		raw, err := rpcClient.CallContext(
			"2.0",
			"eth_getUncleByBlockNumberAndIndex",
			blockNumberHex,
			hexutil.EncodeUint64(uint64(n)),
		)
		if err != nil {
			return blockStats, err
		}

		uncle := Block{}
		err = json.Unmarshal(raw, &uncle)
		if err != nil {
			return blockStats, err
		}
		if uncleHash != uncle.Hash {
			err = fmt.Errorf("uncle hash doesn't match: have %s and want %s", uncleHash, uncle.Hash)
			return blockStats, err
		}

		uncleBlockNumber, err := hexutil.DecodeUint64(uncle.Number)
		if err != nil {
			return blockStats, err
		}

		uncleMinerReward := getBaseReward(blockNumber)
		blockDiffFactor := big.NewInt(int64(uncleBlockNumber) - int64(blockNumber) + 8)
		uncleMinerReward.Mul(&uncleMinerReward, blockDiffFactor)
		uncleMinerReward.Div(&uncleMinerReward, big.NewInt(8))

		uncleInclusionReward := getBaseReward(blockNumber)
		uncleInclusionReward.Div(&uncleInclusionReward, big.NewInt(32))

		blockReward.Add(&blockReward, &uncleMinerReward)
		blockReward.Add(&blockReward, &uncleInclusionReward)
	}

	for _, tHash := range block.Transactions {
		var raw json.RawMessage
		raw, err := rpcClient.CallContext(
			"2.0",
			"eth_getTransactionReceipt",
			tHash,
		)
		if err != nil {
			return blockStats, err
		}

		receipt := TransactionReceipt{}
		err = json.Unmarshal(raw, &receipt)
		if err != nil {
			return blockStats, err
		}

		if receipt.BlockNumber == "" {
			log.Warnf("block %d: found empty transaction receipt\n", blockNumber)
			break
		}
		gasUsed, err := hexutil.DecodeBig(receipt.GasUsed)
		if err != nil {
			return blockStats, err
		}

		effectiveGasPrice := big.NewInt(0)

		if receipt.EffectiveGasPrice != "" {
			effectiveGasPrice, err = hexutil.DecodeBig(receipt.EffectiveGasPrice)
			if err != nil {
				return blockStats, err
			}
		}

		burned := big.NewInt(0)
		burned.Mul(gasUsed, baseFee)

		tips := big.NewInt(0)
		tips.Mul(gasUsed, effectiveGasPrice)
		tips.Sub(tips, burned)

		blockBurned.Add(blockBurned, burned)
		blockTips.Add(blockTips, tips)

		// log.Printf("transactionHash: %s, gasUsed: %d, burned: %d, tips: %d\n", tHash, gasUsed, burned, tips)

	}

	blockStats.Number = uint(blockNumber)
	blockStats.Timestamp = header.Time
	blockStats.BaseFee = hexutil.EncodeBig(baseFee)
	blockStats.Burned = hexutil.EncodeBig(blockBurned)
	blockStats.GasTarget = hexutil.EncodeBig(gasTarget)
	blockStats.GasUsed = hexutil.EncodeBig(gasUsed)
	blockStats.Rewards = hexutil.EncodeBig(&blockReward)
	blockStats.Tips = hexutil.EncodeBig(blockTips)
	blockStats.Transactions = hexutil.EncodeBig(transactionCount)

	globalBlockStats.mu.Lock()
	globalBlockStats.v[blockNumber] = blockStats
	globalBlockStats.mu.Unlock()

	duration := time.Since(start) / time.Millisecond
	log.Printf("block: %d, timestamp: %d, gas_target: %s, gas_used: %s, rewards: %s, tips: %s, baseFee: %s, burned: %s, transactions: %s, ptime: %dms\n", blockNumber, header.Time, gasTarget.String(), gasUsed.String(), blockReward.String(), blockTips.String(), baseFee.String(), blockBurned.String(), transactionCount.String(), duration)

	return blockStats, nil
}

type Block struct {
	BaseFeePerGas    string        `json:"baseFeePerGas"`
	Difficulty       string        `json:"difficulty"`
	ExtraData        string        `json:"extraData"`
	GasLimit         string        `json:"gasLimit"`
	GasUsed          string        `json:"gasUsed"`
	Hash             string        `json:"hash"`
	LogsBloom        string        `json:"logsBloom"`
	Miner            string        `json:"miner"`
	MixHash          string        `json:"mixHash"`
	Nonce            string        `json:"nonce"`
	Number           string        `json:"number"`
	ParentHash       string        `json:"parentHash"`
	ReceiptsRoot     string        `json:"receiptsRoot"`
	Sha3Uncles       string        `json:"sha3Uncles"`
	Size             string        `json:"size"`
	StateRoot        string        `json:"stateRoot"`
	Timestamp        string        `json:"timestamp"`
	TotalDifficulty  string        `json:"totalDifficulty"`
	Transactions     []string      `json:"transactions"`
	TransactionsRoot string        `json:"transactionsRoot"`
	Uncles           []interface{} `json:"uncles"`
}

type TransactionReceipt struct {
	BlockHash         string      `json:"blockHash"`
	BlockNumber       string      `json:"blockNumber"`
	ContractAddress   interface{} `json:"contractAddress"`
	CumulativeGasUsed string      `json:"cumulativeGasUsed"`
	EffectiveGasPrice string      `json:"effectiveGasPrice"`
	From              string      `json:"from"`
	GasUsed           string      `json:"gasUsed"`
	Logs              []struct {
		Address          string   `json:"address"`
		Topics           []string `json:"topics"`
		Data             string   `json:"data"`
		BlockNumber      string   `json:"blockNumber"`
		TransactionHash  string   `json:"transactionHash"`
		TransactionIndex string   `json:"transactionIndex"`
		BlockHash        string   `json:"blockHash"`
		LogIndex         string   `json:"logIndex"`
		Removed          bool     `json:"removed"`
	} `json:"logs"`
	LogsBloom        string `json:"logsBloom"`
	Status           string `json:"status"`
	To               string `json:"to"`
	TransactionHash  string `json:"transactionHash"`
	TransactionIndex string `json:"transactionIndex"`
	Type             string `json:"type"`
}

func getBaseReward(blockNum uint64) big.Int {
	baseReward := big.NewInt(0)
	if blockNum >= constantinopleBlock { //4_230_000 { //7_280_000 {
		constantinopleReward := big.NewInt(2000000000000000000)
		baseReward.Add(baseReward, constantinopleReward)
		return *baseReward
	}

	if blockNum >= byzantiumBlock { //1_700_000 { // 4_370_000 {
		byzantiumReward := big.NewInt(3000000000000000000)
		baseReward.Add(baseReward, byzantiumReward)
		return *baseReward
	}

	genesisReward := big.NewInt(5000000000000000000)
	baseReward.Add(baseReward, genesisReward)
	return *baseReward
}
