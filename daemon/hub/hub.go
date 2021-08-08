package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"sort"
	"strconv"
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
	"blockStats":   true,
	"clientsCount": true,
}

type BlockStatsMap struct {
	mu sync.Mutex
	v  map[uint64]sql.BlockStats
}

type TotalCounter struct {
	mu sync.Mutex
	v  *big.Int
}

var londonBlock = uint64(12_965_000)
var constantinopleBlock = uint64(7_280_000)
var byzantiumBlock = uint64(4_370_000)

var globalBlockStats = BlockStatsMap{v: make(map[uint64]sql.BlockStats)}
var globalTotalBurned = TotalCounter{} //v: big.Int}
var globalTotalTips = TotalCounter{}   //v: big.Int}

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

	globalTotalBurned.mu.Lock()
	globalTotalBurned.v = big.NewInt(0)
	globalTotalBurned.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v = big.NewInt(0)
	globalTotalTips.mu.Unlock()

	subscription := make(chan map[string]interface{})
	clients := make(map[*client]bool)

	log.Infof("Initialize rpcClientHttp '%s'", gethEndpointHTTP)

	rpcClient := &rpcClient{
		endpoint:   gethEndpointHTTP,
		httpClient: new(http.Client),
	}

	log.Infof("Get latest block...")

	latestBlock := newLatestBlock()
	latestBlockNumber, err := UpdateLatestBlock(rpcClient, latestBlock)
	if err != nil {
		log.Errorf("error updating latest block: %v", err)
		return nil, err
	}
	log.Infof("Latest block: %d", latestBlockNumber)

	db, err := sql.ConnectDatabase(dbPath)
	if err != nil {
		return nil, err
	}

	if initializedb {
		InitializeMissingBlocks(rpcClient, db, londonBlock, latestBlockNumber, latestBlock)
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
				latestBlockNumber := latestBlock.getBlockNumber()
				if latestBlockNumber == header.Number.Uint64() {
					continue
				}

				blockNumber := header.Number.Uint64()

				blockStats, blockStatsPercentiles, err := UpdateBlockStats(rpcClient, blockNumber)
				if err != nil {
					log.Errorf("Error getting block stats: %v", err)
				}

				db.AddBlock(blockStats, blockStatsPercentiles)

				clientsCount := len(clients)

				latestBlock.updateBlockNumber(blockNumber)

				subscription <- map[string]interface{}{
					"blockStats":   blockStats,
					"clientsCount": clientsCount,
				}
			}
		}
	}(latestBlock)

	handlers := map[string]func(c *client, message jsonrpcMessage) (json.RawMessage, error){
		"eth_blockNumber": ethBlockNumber(rpcClient, latestBlock),
		"eth_chainId":     handleFunc(rpcClient),
		"eth_getBlockByNumber": ethGetBlockByNumber(
			rpcClient,
			latestBlock,
		),
		"eth_getTransactionByHash": handleFunc(rpcClient),
		"eth_syncing":              handleFunc(rpcClient),
		"eth_getBalance":           handleFunc(rpcClient),

		"internal_getBlockStats": getBlockStats(rpcClient, latestBlock),
		"internal_getTotals":     getTotals(rpcClient),

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
			"",
			params...,
		)
		if err != nil {
			return nil, err
		}

		return raw, nil
	}
}
func InitializeMissingBlocks(rpcClient *rpcClient, db *sql.Database, londonBlock uint64, latestBlockNumber uint64, latestBlock *LatestBlock) {
	highestBlockInDb, err := db.GetHighestBlockNumber()
	if err != nil {
		log.Errorf("Highest block not found %v", err)
		return
	}
	log.Infof("Highest stored block in DB: %d", highestBlockInDb)

	missingBlockNumbers, err := db.GetMissingBlockNumbers(londonBlock)
	if err != nil {
		log.Errorf("Error getting missing block numbers from database: %v", err)
		return
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("Starting to fetch %d missing blocks", len(missingBlockNumbers))
	}

	for _, n := range missingBlockNumbers {
		blockStats, blockStatsPercentiles, err := UpdateBlockStats(rpcClient, n)
		if err != nil {
			log.Errorf("Cannot update block state for '%d',  %v", n, err)
			return
		}
		db.AddBlock(blockStats, blockStatsPercentiles)
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("Finished fetching missing blocks")
	}

	allBlockStats, err := db.GetAllBlockStats()
	if err != nil {
		log.Errorf("Error getting totals from database: %v", err)
		return
	}

	for _, b := range allBlockStats {
		globalBlockStats.mu.Lock()
		globalBlockStats.v[uint64(b.Number)] = b
		globalBlockStats.mu.Unlock()
	}

	allBlockStats = []sql.BlockStats{}

	burned, tips, err := db.GetTotals()
	if err != nil {
		log.Errorf("Error getting totals from database:%v", err)
		return
	}

	log.Printf("Totals: %s burned and %s tips\n", burned.String(), tips.String())

	globalTotalBurned.mu.Lock()
	globalTotalBurned.v.Add(globalTotalBurned.v, burned)
	globalTotalBurned.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v.Add(globalTotalTips.v, tips)
	globalTotalTips.mu.Unlock()

	currentBlock := highestBlockInDb + 1
	if currentBlock == 1 {
		currentBlock = londonBlock
	}

	if latestBlockNumber > currentBlock {
		for {
			blockStats, blockStatsPercentiles, err := UpdateBlockStats(rpcClient, currentBlock)
			if err != nil {
				log.Errorf("Cannot update block state for '%d',  %v", currentBlock, err)
				return
			}
			db.AddBlock(blockStats, blockStatsPercentiles)

			if currentBlock == latestBlockNumber {
				latestBlockNumber, err = UpdateLatestBlock(rpcClient, latestBlock)
				if err != nil {
					log.Errorf("Error updating latest block: %v", err)
					return
				}
				log.Infof("Latest block: %d", latestBlockNumber)
				if currentBlock == latestBlockNumber {
					break
				}
			}
			currentBlock++
		}
	}
}

func ethBlockNumber(
	rpcClient *rpcClient,
	latestBlock *LatestBlock,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		blockNumber := latestBlock.getBlockNumber()
		blockNumberHex := hexutil.EncodeUint64(blockNumber)

		return json.RawMessage(fmt.Sprintf("\"%s\"", blockNumberHex)), nil
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

		blockNumberBig, err := hexutil.DecodeBig(hexBlockNumber)
		if err != nil {
			return nil, fmt.Errorf("blockNumber was not a hex - %s", hexBlockNumber)
		}

		blockNumber := blockNumberBig.Uint64()

		if blockNumber > latestBlock.getBlockNumber() {
			return nil, fmt.Errorf("requested blockNumber is bigger than latest - req: %d, lat: %d", blockNumber, latestBlock.blockNumber)
		}

		raw, err := rpcClient.CallContext(
			message.Version,
			message.Method,
			blockNumberBig.String(),
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

func getTotals(
	rpcClient *rpcClient,
) func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *client, message jsonrpcMessage) (json.RawMessage, error) {
		globalTotalBurned.mu.Lock()
		burned := hexutil.EncodeBig(globalTotalBurned.v)
		globalTotalBurned.mu.Unlock()

		globalTotalTips.mu.Lock()
		tipped := hexutil.EncodeBig(globalTotalTips.v)
		globalTotalTips.mu.Unlock()

		return json.RawMessage(fmt.Sprintf("{\"burned\": \"%s\", \"tipped\": \"%s\"}", burned, tipped)), nil
	}
}

func getBlockStats(
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

		latestBlockNumber := (latestBlock.getBlockNumber())
		if blockNumber > latestBlockNumber {
			return nil, err
		}

		var blockStats sql.BlockStats

		globalBlockStats.mu.Lock()
		if blockStats, ok = globalBlockStats.v[blockNumber]; !ok {
			log.Printf("error fetching block stats for block #%d", blockNumber)
			globalBlockStats.mu.Unlock()
			return nil, err
		}
		globalBlockStats.mu.Unlock()

		blockStatsJson, err := json.Marshal(blockStats)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(blockStatsJson), nil
	}
}

func UpdateBlockStats(rpcClient *rpcClient, blockNumber uint64) (sql.BlockStats, []sql.BlockStatsPercentiles, error) {
	start := time.Now()
	var blockNumberHex string
	var blockStats sql.BlockStats
	var blockStatsPercentiles []sql.BlockStatsPercentiles
	var rawResponse json.RawMessage

	blockNumberHex = hexutil.EncodeUint64(blockNumber)

	rawResponse, err := rpcClient.CallContext(
		"2.0",
		"eth_getBlockByNumber",
		strconv.Itoa(int(blockNumber)),
		blockNumberHex,
		false,
	)
	if err != nil {
		log.Errorf("error getting block details from geth: %v", err)
		return blockStats, blockStatsPercentiles, err
	}

	block := Block{}
	err = json.Unmarshal(rawResponse, &block)
	if err != nil {
		return blockStats, blockStatsPercentiles, err
	}

	header := types.Header{}
	err = json.Unmarshal(rawResponse, &header)
	if err != nil {
		return blockStats, blockStatsPercentiles, err
	}

	gasUsed, err := hexutil.DecodeBig(block.GasUsed)
	if err != nil {
		return blockStats, blockStatsPercentiles, err
	}

	gasTarget, err := hexutil.DecodeBig(block.GasLimit)
	if err != nil {
		return blockStats, blockStatsPercentiles, err
	}

	if blockNumber > londonBlock {
		gasTarget.Div(gasTarget, big.NewInt(2))
	}

	baseFee := big.NewInt(0)

	if block.BaseFeePerGas != "" {
		baseFee, err = hexutil.DecodeBig(block.BaseFeePerGas)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
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
			strconv.Itoa(int(blockNumber)),
			blockNumberHex,
			hexutil.EncodeUint64(uint64(n)),
		)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
		}

		uncle := Block{}
		err = json.Unmarshal(raw, &uncle)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
		}
		if uncleHash != uncle.Hash {
			err = fmt.Errorf("uncle hash doesn't match: have %s and want %s", uncleHash, uncle.Hash)
			return blockStats, blockStatsPercentiles, err
		}

		uncleBlockNumber, err := hexutil.DecodeUint64(uncle.Number)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
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

	var allPriorityFeePerGasMwei []uint64

	for _, tHash := range block.Transactions {
		var raw json.RawMessage
		raw, err := rpcClient.CallContext(
			"2.0",
			"eth_getTransactionReceipt",
			strconv.Itoa(int(blockNumber)),
			tHash,
		)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
		}

		receipt := TransactionReceipt{}
		err = json.Unmarshal(raw, &receipt)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
		}

		if receipt.BlockNumber == "" {
			log.Warnf("block %d: found empty transaction receipt", blockNumber)
			continue
			//break
		}
		gasUsed, err := hexutil.DecodeBig(receipt.GasUsed)
		if err != nil {
			return blockStats, blockStatsPercentiles, err
		}

		effectiveGasPrice := big.NewInt(0)

		if receipt.EffectiveGasPrice != "" {
			effectiveGasPrice, err = hexutil.DecodeBig(receipt.EffectiveGasPrice)
			if err != nil {
				return blockStats, blockStatsPercentiles, err
			}
		}

		burned := big.NewInt(0)
		burned.Mul(gasUsed, baseFee)

		tips := big.NewInt(0)
		tips.Mul(gasUsed, effectiveGasPrice)
		tips.Sub(tips, burned)

		priorityFeePerGas := big.NewInt(0)
		priorityFeePerGas.Div(tips, gasUsed)
		priorityFeePerGasMwei := priorityFeePerGas.Div(priorityFeePerGas, big.NewInt(1_000_000)).Uint64()

		allPriorityFeePerGasMwei = append(allPriorityFeePerGasMwei, priorityFeePerGasMwei)

		blockBurned.Add(blockBurned, burned)
		blockTips.Add(blockTips, tips)
	}

	// sort slices that will be used for percentile calculations later
	sort.Slice(allPriorityFeePerGasMwei, func(i, j int) bool { return allPriorityFeePerGasMwei[i] < allPriorityFeePerGasMwei[j] })

	blockStatsPercentiles = append(blockStatsPercentiles, sql.BlockStatsPercentiles{
		Number:       uint(blockNumber),
		Metric:       "PFpG",
		Maximum:      uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 100)),
		Median:       uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 50)),
		Minimum:      uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 0)),
		Tenth:        uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 10)),
		TwentyFifth:  uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 25)),
		SeventyFifth: uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 75)),
		Ninetieth:    uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 90)),
		NinetyFifth:  uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
		NinetyNinth:  uint(GetPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
	})

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

	globalTotalBurned.mu.Lock()
	globalTotalBurned.v.Add(globalTotalBurned.v, blockBurned)
	globalTotalBurned.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v.Add(globalTotalTips.v, blockTips)
	globalTotalTips.mu.Unlock()

	duration := time.Since(start) / time.Millisecond
	log.Printf("block: %d, timestamp: %d, gas_target: %s, gas_used: %s, rewards: %s, tips: %s, baseFee: %s, burned: %s, transactions: %s, ptime: %dms\n", blockNumber, header.Time, gasTarget.String(), gasUsed.String(), blockReward.String(), blockTips.String(), baseFee.String(), blockBurned.String(), transactionCount.String(), duration)

	return blockStats, blockStatsPercentiles, nil
}

func GetPercentileSortedUint64(values []uint64, perc int) uint64 {
	if len(values) == 0 {
		return 0
	}
	if perc == 100 {
		return values[len(values)-1]
	}

	rank := int(math.Ceil(float64(len(values)) * float64(perc) / 100))

	if rank == 0 {
		return values[0]
	}

	return values[rank-1]
}

func UpdateLatestBlock(rpcClient *rpcClient, latestBlock *LatestBlock) (uint64, error) {
	latestBlockRaw, err := rpcClient.CallContext(
		"2.0",
		"eth_blockNumber",
		"",
	)
	if err != nil {

		return 0, fmt.Errorf("failed to fetch latest block number from geth")
	}

	var hexBlockNumber string
	err = json.Unmarshal(latestBlockRaw, &hexBlockNumber)
	if err != nil {
		return 0, fmt.Errorf("couldn't unmarshal latest bock number response: %v", latestBlockRaw)
	}

	latestBlockNumber, err := hexutil.DecodeUint64(hexBlockNumber)
	if err != nil {
		return 0, fmt.Errorf("latest block could not be decoded from hex to uint: %v", hexBlockNumber)
	}

	latestBlock.updateBlockNumber(latestBlockNumber)

	return latestBlockNumber, nil
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
