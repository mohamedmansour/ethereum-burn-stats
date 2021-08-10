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
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/version"
	"github.com/sirupsen/logrus"
)

var log = logrus.StandardLogger()

var allowedEthSubscriptions = map[string]bool{
	"blockStats":   true,
	"clientsCount": true,
	"data":         true,
}

type blockStatsMap struct {
	mu sync.Mutex
	v  map[uint64]sql.BlockStats
}

type totalCounter struct {
	mu sync.Mutex
	v  *big.Int
}

var londonBlock = uint64(12_965_000)
var constantinopleBlock = uint64(7_280_000)
var byzantiumBlock = uint64(4_370_000)

var globalBlockStats = blockStatsMap{v: make(map[uint64]sql.BlockStats)}
var globalTotalBurned = totalCounter{}
var globalTotalIssuance = totalCounter{}
var globalTotalTips = totalCounter{}

// Hub maintains the set of active clients and subscriptions messages to the
// clients.
type Hub struct {
	upgrader *websocket.Upgrader

	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	subscription chan map[string]interface{}

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	handlers map[string]func(c *Client, message jsonrpcMessage) (json.RawMessage, error)

	rpcClient    *RPCClient
	db           *sql.Database
	latestBlock  *LatestBlock
	latestBlocks *LatestBlocks
}

// New initializes a Hub instance.
func New(
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
	dbPath string,
	initializedb bool,
	ropsten bool,
) (*Hub, error) {
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

	globalTotalIssuance.mu.Lock()
	globalTotalIssuance.v = big.NewInt(0)
	globalTotalIssuance.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v = big.NewInt(0)
	globalTotalTips.mu.Unlock()

	subscription := make(chan map[string]interface{})
	clients := make(map[*Client]bool)

	log.Infof("Initialize rpcClientHttp '%s'", gethEndpointHTTP)

	rpcClient := &RPCClient{
		endpoint:   gethEndpointHTTP,
		httpClient: new(http.Client),
	}

	log.Infof("Get latest block...")

	latestBlock := newLatestBlock()
	latestBlocks := newLatestBlocks(50)

	db, err := sql.ConnectDatabase(dbPath)
	if err != nil {
		return nil, err
	}

	h := &Hub{
		upgrader: upgrader,

		subscription: subscription,
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		clients:      clients,

		rpcClient:    rpcClient,
		db:           db,
		latestBlock:  latestBlock,
		latestBlocks: latestBlocks,
	}

	err = h.initialize(initializedb, gethEndpointWebsocket)
	if err != nil {
		return h, nil
	}

	return h, nil
}

func (h *Hub) initialize(initializedb bool, gethEndpointWebsocket string) error {
	latestBlockNumber, err := h.initializeLatestBlock()
	if err != nil {
		return err
	}

	if initializedb {
		err = h.initializeMissingBlocks(londonBlock, latestBlockNumber)
		if err != nil && h.latestBlock.getBlockNumber() == 0 {
			return err
		}
	}

	h.initializeLatest50Blocks()
	h.initializeWebSocketHandlers()

	err = h.initializeGrpcWebSocket(gethEndpointWebsocket)

	return err
}

func (h *Hub) initializeLatestBlock() (uint64, error) {
	var latestBlockNumber uint64
	latestBlockNumber, err := h.updateLatestBlock()
	if err != nil {
		return 0, fmt.Errorf("error updating latest block: %v", err)
	}

	log.Infof("Latest block: %d", latestBlockNumber)
	return latestBlockNumber, nil
}

func (h *Hub) initializeLatest50Blocks() {
	globalBlockStats.mu.Lock()
	defer globalBlockStats.mu.Unlock()

	latestBlockNumber := h.latestBlock.getBlockNumber()

	blockCount := min(50, len(globalBlockStats.v))
	for i := latestBlockNumber - uint64(blockCount); i <= latestBlockNumber; i++ {
		if blockStat, ok := globalBlockStats.v[i]; ok {
			h.latestBlocks.addBlock(blockStat)
		}
	}
}

func (h *Hub) initializeWebSocketHandlers() {
	h.handlers = map[string]func(c *Client, message jsonrpcMessage) (json.RawMessage, error){
		// deprecated
		"internal_getTotals": h.handleTotals(),
		"eth_blockNumber":    h.ethBlockNumber(),
		"eth_chainId":        h.handleFunc(),

		// internal custom geth commands.
		"internal_getBlockStats":  h.getBlockStats(),
		"internal_getInitialData": h.handleInitialData(),

		// proxy to geth
		"eth_getBlockByNumber":     h.ethGetBlockByNumber(),
		"eth_getTransactionByHash": h.handleFunc(),
		"eth_syncing":              h.handleFunc(),
		"eth_getBalance":           h.handleFunc(),

		// proxy to rpc
		"eth_subscribe":   h.ethSubscribe(),
		"eth_unsubscribe": h.ethUnsubscribe(),
	}
}

func (h *Hub) initializeGrpcWebSocket(gethEndpointWebsocket string) error {
	log.Infof("Initialize gethRPCClientWebsocket '%s'", gethEndpointWebsocket)
	gethRPCClientWebsocket, err := gethRPC.Dial(gethEndpointWebsocket)
	if err != nil {
		return fmt.Errorf("WebSocket cannot dial: %v", err)
	}

	headers := make(chan *types.Header)
	sub, err := gethRPCClientWebsocket.EthSubscribe(context.Background(), headers, "newHeads")
	if err != nil {
		return fmt.Errorf("WebSpclet cannot subscribe to newHeads: %v", err)
	}

	go func(latestBlock *LatestBlock, latestBlocks *LatestBlocks) {
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

				blockStats, blockStatsPercentiles, err := h.updateBlockStats(blockNumber)
				if err != nil {
					log.Errorf("Error getting block stats: %v", err)
				} else {
					latestBlocks.addBlock(blockStats)
				}

				h.db.AddBlock(blockStats, blockStatsPercentiles)
				latestBlock.updateBlockNumber(blockNumber)

				clientsCount := len(h.clients)
				totals := h.getTotals()

				h.subscription <- map[string]interface{}{
					"blockStats":   blockStats,
					"clientsCount": clientsCount,
					"data": &BlockData{
						Block:   blockStats,
						Clients: int16(clientsCount),
						Totals:  *totals,
						Version: version.Version,
					},
				}
			}
		}
	}(h.latestBlock, h.latestBlocks)

	return nil
}

func (h *Hub) listen() {
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

// ListenAndServe serves the hub on the given network address.
func (h *Hub) ListenAndServe(addr string) error {
	go h.listen()

	http.HandleFunc("/", h.serveWebSocket)

	err := http.ListenAndServe(addr, nil)
	if err != nil {
		return err
	}

	return nil
}

func (h *Hub) serveWebSocket(w http.ResponseWriter, r *http.Request) {
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

func (h *Hub) handleFunc() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		raw, err := h.rpcClient.CallContext(
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
func (h *Hub) initializeMissingBlocks(londonBlock uint64, latestBlockNumber uint64) error {
	highestBlockInDb, err := h.db.GetHighestBlockNumber()
	if err != nil {
		return fmt.Errorf("highest block not found %v", err)
	}
	log.Infof("Highest stored block in DB: %d", highestBlockInDb)

	missingBlockNumbers, err := h.db.GetMissingBlockNumbers(londonBlock)
	if err != nil {
		return fmt.Errorf("error getting missing block numbers from database: %v", err)
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("Starting to fetch %d missing blocks", len(missingBlockNumbers))
	}

	for _, n := range missingBlockNumbers {
		blockStats, blockStatsPercentiles, err := h.updateBlockStats(n)
		if err != nil {
			return fmt.Errorf("cannot update block state for '%d',  %v", n, err)
		}
		h.db.AddBlock(blockStats, blockStatsPercentiles)
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("Finished fetching missing blocks")
	}

	allBlockStats, err := h.db.GetAllBlockStats()
	if err != nil {
		return fmt.Errorf("error getting totals from database: %v", err)
	}

	for _, b := range allBlockStats {
		globalBlockStats.mu.Lock()
		globalBlockStats.v[uint64(b.Number)] = b
		globalBlockStats.mu.Unlock()
	}

	allBlockStats = []sql.BlockStats{}

	burned, issuance, tips, err := h.db.GetTotals()
	if err != nil {
		return fmt.Errorf("error getting totals from database:%v", err)
	}

	log.Printf("Totals: %s burned, %s issuance, and %s tips\n", burned.String(), issuance.String(), tips.String())

	globalTotalBurned.mu.Lock()
	globalTotalBurned.v.Add(globalTotalBurned.v, burned)
	globalTotalBurned.mu.Unlock()

	globalTotalIssuance.mu.Lock()
	globalTotalIssuance.v.Add(globalTotalIssuance.v, issuance)
	globalTotalIssuance.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v.Add(globalTotalTips.v, tips)
	globalTotalTips.mu.Unlock()

	currentBlock := highestBlockInDb + 1
	if currentBlock == 1 {
		currentBlock = londonBlock
	}

	if latestBlockNumber > currentBlock {
		for {
			blockStats, blockStatsPercentiles, err := h.updateBlockStats(currentBlock)
			if err != nil {
				return fmt.Errorf("cannot update block state for '%d',  %v", currentBlock, err)
			}
			h.db.AddBlock(blockStats, blockStatsPercentiles)

			if currentBlock == latestBlockNumber {
				latestBlockNumber, err = h.updateLatestBlock()
				if err != nil {
					return fmt.Errorf("error updating latest block: %v", err)
				}
				log.Infof("Latest block: %d", latestBlockNumber)
				if currentBlock == latestBlockNumber {
					break
				}
			}
			currentBlock++
		}
	}

	return nil
}

func (h *Hub) ethBlockNumber() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		blockNumber := h.latestBlock.getBlockNumber()
		blockNumberHex := hexutil.EncodeUint64(blockNumber)

		return json.RawMessage(fmt.Sprintf("\"%s\"", blockNumberHex)), nil
	}
}

func (h *Hub) ethGetBlockByNumber() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

		if blockNumber > h.latestBlock.getBlockNumber() {
			return nil, fmt.Errorf("requested blockNumber is bigger than latest - req: %d, lat: %d", blockNumber, h.latestBlock.getBlockNumber())
		}

		raw, err := h.rpcClient.CallContext(
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

func (h *Hub) ethSubscribe() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

func (h *Hub) ethUnsubscribe() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

func (h *Hub) handleTotals() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		totalsJSON, err := json.Marshal(h.getTotals())
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(totalsJSON), nil
	}
}

func (h *Hub) handleInitialData() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		totals := h.getTotals()

		data := &InitialData{
			BlockNumber: h.latestBlock.getBlockNumber(),
			Blocks:      h.latestBlocks.getBlocks(),
			Clients:     int16(len(h.clients)),
			Totals:      *totals,
			Version:     version.Version,
		}

		dataJSON, err := json.Marshal(data)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(dataJSON), nil
	}
}

func (h *Hub) getTotals() *Totals {
	globalTotalBurned.mu.Lock()
	burned := hexutil.EncodeBig(globalTotalBurned.v)
	globalTotalBurned.mu.Unlock()

	globalTotalIssuance.mu.Lock()
	issuance := hexutil.EncodeBig(globalTotalIssuance.v)
	globalTotalIssuance.mu.Unlock()

	globalTotalTips.mu.Lock()
	tipped := hexutil.EncodeBig(globalTotalTips.v)
	globalTotalTips.mu.Unlock()

	return &Totals{
		Burned:   burned,
		Issuance: issuance,
		Tipped:   tipped,
	}
}

func (h *Hub) getBlockStats() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

		latestBlockNumber := (h.latestBlock.getBlockNumber())
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

		blockStatsJSON, err := json.Marshal(blockStats)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(blockStatsJSON), nil
	}
}

func (h *Hub) updateBlockStats(blockNumber uint64) (sql.BlockStats, []sql.BlockStatsPercentiles, error) {
	start := time.Now()
	var blockNumberHex string
	var blockStats sql.BlockStats
	var blockStatsPercentiles []sql.BlockStatsPercentiles
	var rawResponse json.RawMessage

	blockNumberHex = hexutil.EncodeUint64(blockNumber)

	rawResponse, err := h.rpcClient.CallContext(
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
		raw, err := h.rpcClient.CallContext(
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
		raw, err := h.rpcClient.CallContext(
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
		Maximum:      uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 100)),
		Median:       uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 50)),
		Minimum:      uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 0)),
		Tenth:        uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 10)),
		TwentyFifth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 25)),
		SeventyFifth: uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 75)),
		Ninetieth:    uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 90)),
		NinetyFifth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
		NinetyNinth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
	})

	priorityFee := big.NewInt(int64(getPercentileSortedUint64(allPriorityFeePerGasMwei, 50)))
	priorityFee.Mul(priorityFee, big.NewInt(1_000_000))

	blockStats.Number = uint(blockNumber)
	blockStats.Timestamp = header.Time
	blockStats.BaseFee = hexutil.EncodeBig(baseFee)
	blockStats.Burned = hexutil.EncodeBig(blockBurned)
	blockStats.GasTarget = hexutil.EncodeBig(gasTarget)
	blockStats.GasUsed = hexutil.EncodeBig(gasUsed)
	blockStats.PriorityFee = hexutil.EncodeBig(priorityFee)
	blockStats.Rewards = hexutil.EncodeBig(&blockReward)
	blockStats.Tips = hexutil.EncodeBig(blockTips)
	blockStats.Transactions = hexutil.EncodeBig(transactionCount)

	globalBlockStats.mu.Lock()
	globalBlockStats.v[blockNumber] = blockStats
	globalBlockStats.mu.Unlock()

	globalTotalBurned.mu.Lock()
	globalTotalBurned.v.Add(globalTotalBurned.v, blockBurned)
	globalTotalBurned.mu.Unlock()

	globalTotalIssuance.mu.Lock()
	globalTotalIssuance.v.Add(globalTotalIssuance.v, &blockReward)
	globalTotalIssuance.v.Sub(globalTotalIssuance.v, blockBurned)
	globalTotalIssuance.mu.Unlock()

	globalTotalTips.mu.Lock()
	globalTotalTips.v.Add(globalTotalTips.v, blockTips)
	globalTotalTips.mu.Unlock()

	duration := time.Since(start) / time.Millisecond
	log.Printf("block: %d, timestamp: %d, gas_target: %s, gas_used: %s, rewards: %s, tips: %s, baseFee: %s, burned: %s, transactions: %s, ptime: %dms\n", blockNumber, header.Time, gasTarget.String(), gasUsed.String(), blockReward.String(), blockTips.String(), baseFee.String(), blockBurned.String(), transactionCount.String(), duration)

	return blockStats, blockStatsPercentiles, nil
}

func getPercentileSortedUint64(values []uint64, perc int) uint64 {
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

func (h *Hub) updateLatestBlock() (uint64, error) {
	latestBlockRaw, err := h.rpcClient.CallContext(
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

	h.latestBlock.updateBlockNumber(latestBlockNumber)

	return latestBlockNumber, nil
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

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
