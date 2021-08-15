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

type blockTotalsMap struct {
	mu sync.Mutex
	v  map[uint64]Totals
}

var londonBlock = uint64(12_965_000)
var constantinopleBlock = uint64(7_280_000)
var byzantiumBlock = uint64(4_370_000)

var globalBlockStats = blockStatsMap{v: make(map[uint64]sql.BlockStats)}
var globalTotals = blockTotalsMap{v: make(map[uint64]Totals)}

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

	// used to track new, duplicate blocks
	duplicateBlock bool

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

	subscription := make(chan map[string]interface{})
	clients := make(map[*Client]bool)

	log.Infof("Initialize rpcClientHttp '%s'", gethEndpointHTTP)

	rpcClient := &RPCClient{
		endpoint:   gethEndpointHTTP,
		httpClient: new(http.Client),
	}

	log.Infof("Get latest block...")

	latestBlock := newLatestBlock()
	latestBlocks := newLatestBlocks(150)

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

	err = h.initialize(gethEndpointWebsocket)
	if err != nil {
		return nil, err
	}

	return h, nil
}

func (h *Hub) initialize(gethEndpointWebsocket string) error {
	_, err := h.updateLatestBlock()
	if err != nil {
		return fmt.Errorf("error updating latest block: %v", err)
	}

	highestBlockInDB, err := h.initGetBlocksFromDB()
	if err != nil {
		log.Errorf("error during initGetGetBlocksFromDB: %v", err)
		return err
	}

	err = h.initGetMissingBlocks()
	if err != nil {
		log.Errorf("error during initGetMissingBlocks: %v", err)
		return err
	}

	err = h.initGetLatestBlocks(highestBlockInDB)
	if err != nil {
		log.Errorf("error during initGetLatestBlocks: %v", err)
		return err
	}

	h.updateAllTotals(h.latestBlock.getBlockNumber())

	h.initializeLatestBlocks()
	h.initializeWebSocketHandlers()

	err = h.initializeGrpcWebSocket(gethEndpointWebsocket)

	return err
}

func (h *Hub) initializeLatestBlocks() {
	globalBlockStats.mu.Lock()
	defer globalBlockStats.mu.Unlock()

	latestBlockNumber := h.latestBlock.getBlockNumber()

	blockCount := min(h.latestBlocks.maxBlocks, len(globalBlockStats.v))
	log.Infof("Initialize latest %d blocks", blockCount)
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
				blockNumber := header.Number.Uint64()

				if latestBlockNumber == blockNumber {
					h.duplicateBlock = true
					log.Warnf("block repeated: %s", header.Number.String())
					continue
				}

				for h.duplicateBlock {
					previousBlock := blockNumber - 1
					blockStats, blockStatsPercentiles, baseFeeNext, err := h.updateBlockStats(previousBlock, h.duplicateBlock)
					if err != nil {
						log.Errorf("Error getting block stats for block %d: %v", previousBlock, err)
						h.duplicateBlock = false
						continue
					} else {
						latestBlocks.addBlock(blockStats)
					}

					totals, err := h.updateTotals(previousBlock)
					if err != nil {
						log.Errorf("Error updating totals for block %d: %v", previousBlock, err)
						h.duplicateBlock = false
						continue
					}

					h.db.AddBlock(blockStats, blockStatsPercentiles)
					latestBlock.updateBlockNumber(previousBlock)

					clientsCount := len(h.clients)

					h.subscription <- map[string]interface{}{
						"blockStats":   blockStats,
						"clientsCount": clientsCount,
						"data": &BlockData{
							BaseFeeNext: baseFeeNext,
							Block:       blockStats,
							Clients:     int16(clientsCount),
							Totals:      totals,
							Version:     version.Version,
						},
					}

					h.duplicateBlock = false
					time.Sleep(500 * time.Millisecond)
					continue
				}

				blockStats, blockStatsPercentiles, baseFeeNext, err := h.updateBlockStats(blockNumber, h.duplicateBlock)
				if err != nil {
					log.Errorf("Error getting block stats: %v", err)
					continue
				} else {
					latestBlocks.addBlock(blockStats)
				}

				totals, err := h.updateTotals(blockNumber)
				if err != nil {
					log.Errorf("Error updating totals for block %d: %v", blockNumber, err)
					continue
				}

				h.db.AddBlock(blockStats, blockStatsPercentiles)
				latestBlock.updateBlockNumber(blockNumber)

				clientsCount := len(h.clients)

				h.subscription <- map[string]interface{}{
					"blockStats":   blockStats,
					"clientsCount": clientsCount,
					"data": &BlockData{
						BaseFeeNext: baseFeeNext,
						Block:       blockStats,
						Clients:     int16(clientsCount),
						Totals:      totals,
						Version:     version.Version,
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
			false,
			params...,
		)
		if err != nil {
			return nil, err
		}

		return raw, nil
	}
}

func (h *Hub) initGetBlocksFromDB() (uint64, error) {
	highestBlockInDB, err := h.db.GetHighestBlockNumber()
	if err != nil {
		return londonBlock, fmt.Errorf("highest block not found %v", err)
	}
	log.Infof("init: GetBlocksFromDB - Highest block is %d", highestBlockInDB)

	allBlockStats, err := h.db.GetAllBlockStats()
	if err != nil {
		return londonBlock, fmt.Errorf("error getting totals from database: %v", err)
	}

	for _, b := range allBlockStats {
		globalBlockStats.mu.Lock()
		globalBlockStats.v[uint64(b.Number)] = b
		globalBlockStats.mu.Unlock()
	}

	log.Infof("init: GetBlocksFromDB - Imported %d blocks", len(allBlockStats))

	if highestBlockInDB == 0 {
		return londonBlock, nil
	}

	return highestBlockInDB, nil
}

func (h *Hub) initGetMissingBlocks() error {
	var blockNumbers, missingBlockNumbers []uint64

	globalBlockStats.mu.Lock()
	for _, b := range globalBlockStats.v {
		blockNumbers = append(blockNumbers, uint64(b.Number))
	}
	globalBlockStats.mu.Unlock()

	// sort slice to find missing blocks
	sort.Slice(blockNumbers, func(i, j int) bool { return blockNumbers[i] < blockNumbers[j] })

	for i := 1; i < len(blockNumbers); i++ {
		if blockNumbers[i]-blockNumbers[i-1] != 1 {
			for x := uint64(1); x < blockNumbers[i]-blockNumbers[i-1]; x++ {
				missingBlockNumber := blockNumbers[i-1] + x
				if missingBlockNumber > londonBlock {
					missingBlockNumbers = append(missingBlockNumbers, missingBlockNumber)
				}
			}
		}
	}

	log.Infof("init: GetMissingBlocks - Fetching %d missing blocks", len(missingBlockNumbers))

	for _, n := range missingBlockNumbers {
		blockStats, blockStatsPercentiles, _, err := h.updateBlockStats(n, true)
		if err != nil {
			return fmt.Errorf("cannot update block state for '%d',  %v", n, err)
		}
		h.db.AddBlock(blockStats, blockStatsPercentiles)
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("Finished fetching missing blocks")
	}

	return nil
}

func (h *Hub) initGetLatestBlocks(highestBlockInDB uint64) error {
	currentBlock := highestBlockInDB + 1
	latestBlock := h.latestBlock.getBlockNumber()
	log.Infof("init: GetLatestBlocks - Fetching %d blocks (%d -> %d)", latestBlock-highestBlockInDB, currentBlock, latestBlock)

	if latestBlock >= currentBlock {
		for {
			blockStats, blockStatsPercentiles, _, err := h.updateBlockStats(currentBlock, true)
			if err != nil {
				return fmt.Errorf("cannot update block state for '%d',  %v", currentBlock, err)
			}
			h.db.AddBlock(blockStats, blockStatsPercentiles)

			if currentBlock == latestBlock {
				latestBlock, err = h.updateLatestBlock()
				if err != nil {
					return fmt.Errorf("error updating latest block: %v", err)
				}
				log.Infof("Latest block: %d", latestBlock)
				if currentBlock == latestBlock {
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
			false,
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
		totals, err := h.getTotals(h.latestBlock.getBlockNumber())
		if err != nil {
			log.Errorf("Error calling getTotals: %vn", err)
		}
		totalsJSON, err := json.Marshal(totals)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(totalsJSON), nil
	}
}

func (h *Hub) handleInitialData() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		totals, err := h.getTotals(h.latestBlock.getBlockNumber())
		if err != nil {
			log.Errorf("Error calling getTotals: %vn", err)
		}

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

func (h *Hub) getTotals(blockNumber uint64) (*Totals, error) {
	var totals Totals
	var ok bool

	globalTotals.mu.Lock()
	defer globalTotals.mu.Unlock()
	if totals, ok = globalTotals.v[blockNumber]; !ok {
		return nil, fmt.Errorf("error getting totals for block #%d", blockNumber)
	}

	return &totals, nil
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

func (h *Hub) updateTotals(blockNumber uint64) (Totals, error) {
	var totals Totals

	globalBlockStats.mu.Lock()
	globalTotals.mu.Lock()
	defer globalBlockStats.mu.Unlock()
	defer globalTotals.mu.Unlock()

	totalBurned := big.NewInt(0)
	totalIssuance := big.NewInt(0)
	totalRewards := big.NewInt(0)
	totalTips := big.NewInt(0)

	block := globalBlockStats.v[blockNumber]

	if prevTotals, ok := globalTotals.v[blockNumber-1]; ok {
		prevTotalBurned, err := hexutil.DecodeBig(prevTotals.Burned)
		if err != nil {
			return totals, fmt.Errorf("prevTotals.Burned is not a hex - %s", prevTotals.Burned)
		}
		prevTotalRewards, err := hexutil.DecodeBig(prevTotals.Rewards)
		if err != nil {
			return totals, fmt.Errorf("prevTotals.Rewards is not a hex - %s", prevTotals.Rewards)
		}
		prevTotalTips, err := hexutil.DecodeBig(prevTotals.Tips)
		if err != nil {
			return totals, fmt.Errorf("prevTotals.Tips is not a hex - %s", prevTotals.Tips)
		}
		blockBurned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			return totals, fmt.Errorf("block.Burned is not a hex - %s", block.Burned)
		}
		blockRewards, err := hexutil.DecodeBig(block.Rewards)
		if err != nil {
			return totals, fmt.Errorf("block.Reward is not a hex - %s", block.Rewards)
		}
		blockTips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			return totals, fmt.Errorf("block.Tips is not a hex - %s", block.Tips)
		}
		totalBurned.Add(prevTotalBurned, blockBurned)
		totalRewards.Add(prevTotalRewards, blockRewards)
		totalIssuance.Sub(totalRewards, totalBurned)
		totalTips.Add(prevTotalTips, blockTips)
	}

	totals.Burned = hexutil.EncodeBig(totalBurned)
	totals.Issuance = hexutil.EncodeBig(totalIssuance)
	totals.Rewards = hexutil.EncodeBig(totalRewards)
	totals.Tips = hexutil.EncodeBig(totalTips)

	globalTotals.v[blockNumber] = totals

	return totals, nil
}

func (h *Hub) updateAllTotals(blockNumber uint64) (Totals, error) {
	start := time.Now()
	var totals Totals

	log.Infof("Updating totals for every block from %d to %d (%d blocks)", londonBlock, blockNumber, blockNumber-londonBlock)

	totalBurned := big.NewInt(0)
	totalIssuance := big.NewInt(0)
	totalRewards := big.NewInt(0)
	totalTips := big.NewInt(0)

	globalBlockStats.mu.Lock()
	defer globalBlockStats.mu.Unlock()

	for i := londonBlock; i <= blockNumber; i++ {
		block := globalBlockStats.v[i]

		burned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			return totals, fmt.Errorf("block.Burned was not a hex - %s", block.Burned)
		}
		totalBurned.Add(totalBurned, burned)

		rewards, err := hexutil.DecodeBig(block.Rewards)
		if err != nil {
			return totals, fmt.Errorf("block.Rewards was not a hex - %s", block.Rewards)
		}
		totalRewards.Add(totalRewards, rewards)

		tips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			return totals, fmt.Errorf("block.Burned was not a hex - %s", block.Tips)
		}
		totalTips.Add(totalBurned, tips)
		totalIssuance.Sub(totalRewards, totalBurned)

		totals.Burned = hexutil.EncodeBig(totalBurned)
		totals.Issuance = hexutil.EncodeBig(totalIssuance)
		totals.Rewards = hexutil.EncodeBig(totalRewards)
		totals.Tips = hexutil.EncodeBig(totalTips)

		globalTotals.mu.Lock()
		globalTotals.v[uint64(block.Number)] = totals
		globalTotals.mu.Unlock()
		if block.Number%5000 == 0 {
			log.Infof("block %d totals: %s burned, %s issuance, %s rewards, and %s tips", block.Number, totalBurned.String(), totalIssuance.String(), totalRewards.String(), totalTips.String())
		}
	}

	duration := time.Since(start) / time.Millisecond
	log.Infof("block %d totals: %s burned, %s issuance, %s rewards, and %s tips (ptime: %dms)", blockNumber, totalBurned.String(), totalIssuance.String(), totalRewards.String(), totalTips.String(), duration)

	return totals, nil
}

func (h *Hub) updateBlockStats(blockNumber uint64, updateCache bool) (sql.BlockStats, []sql.BlockStatsPercentiles, string, error) {
	start := time.Now()
	var blockNumberHex, baseFeeNextHex string
	var blockStats sql.BlockStats
	var blockStatsPercentiles []sql.BlockStatsPercentiles
	var rawResponse json.RawMessage

	blockNumberHex = hexutil.EncodeUint64(blockNumber)

	rawResponse, err := h.rpcClient.CallContext(
		"2.0",
		"eth_getBlockByNumber",
		strconv.Itoa(int(blockNumber)),
		updateCache,
		blockNumberHex,
		false,
	)
	if err != nil {
		log.Errorf("error getting block details from geth: %v", err)
		return blockStats, blockStatsPercentiles, baseFeeNextHex, err
	}

	block := Block{}
	err = json.Unmarshal(rawResponse, &block)
	if err != nil {
		return blockStats, blockStatsPercentiles, baseFeeNextHex, err
	}

	header := types.Header{}
	err = json.Unmarshal(rawResponse, &header)
	if err != nil {
		return blockStats, blockStatsPercentiles, baseFeeNextHex, err
	}

	gasUsed, err := hexutil.DecodeBig(block.GasUsed)
	if err != nil {
		return blockStats, blockStatsPercentiles, baseFeeNextHex, err
	}

	gasTarget, err := hexutil.DecodeBig(block.GasLimit)
	if err != nil {
		return blockStats, blockStatsPercentiles, baseFeeNextHex, err
	}

	if blockNumber > londonBlock {
		gasTarget.Div(gasTarget, big.NewInt(2))
	}

	//initial london block is 1Gwei baseFee
	baseFee := big.NewInt(1_000_000_000)

	if block.BaseFeePerGas != "" {
		baseFee, err = hexutil.DecodeBig(block.BaseFeePerGas)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}
	}

	transactionCount := big.NewInt(int64(len(block.Transactions)))

	blockBurned := big.NewInt(0)
	blockTips := big.NewInt(0)

	blockReward := getBaseReward(blockNumber)

	baseFeeNext := big.NewInt(0)
	baseFeeNext.Add(baseFeeNext, gasUsed)
	baseFeeNext.Sub(baseFeeNext, gasTarget)
	baseFeeNext.Mul(baseFeeNext, baseFee)
	baseFeeNext.Quo(baseFeeNext, gasTarget)
	baseFeeNext.Quo(baseFeeNext, big.NewInt(8))
	baseFeeNext.Add(baseFeeNext, baseFee)

	baseFeeNextHex = hexutil.EncodeBig(baseFeeNext)

	for n, uncleHash := range block.Uncles {
		var raw json.RawMessage
		raw, err := h.rpcClient.CallContext(
			"2.0",
			"eth_getUncleByBlockNumberAndIndex",
			strconv.Itoa(int(blockNumber)),
			updateCache,
			blockNumberHex,
			hexutil.EncodeUint64(uint64(n)),
		)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}

		uncle := Block{}
		err = json.Unmarshal(raw, &uncle)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}
		if uncleHash != uncle.Hash {
			err = fmt.Errorf("uncle hash doesn't match: have %s and want %s", uncleHash, uncle.Hash)
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}

		uncleBlockNumber, err := hexutil.DecodeUint64(uncle.Number)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
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
			updateCache,
			tHash,
		)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}

		receipt := TransactionReceipt{}
		err = json.Unmarshal(raw, &receipt)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}

		if receipt.BlockNumber == "" {
			log.Warnf("block %d, transaction %s: found empty transaction receipt", blockNumber, tHash)
			continue
			//break
		}
		gasUsed, err := hexutil.DecodeBig(receipt.GasUsed)
		if err != nil {
			return blockStats, blockStatsPercentiles, baseFeeNextHex, err
		}

		effectiveGasPrice := big.NewInt(0)

		if receipt.EffectiveGasPrice != "" {
			effectiveGasPrice, err = hexutil.DecodeBig(receipt.EffectiveGasPrice)
			if err != nil {
				return blockStats, blockStatsPercentiles, baseFeeNextHex, err
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

	duration := time.Since(start) / time.Millisecond
	log.Printf("block: %d, blockHex: %s, timestamp: %d, gas_target: %s, gas_used: %s, rewards: %s, tips: %s, baseFee: %s, burned: %s, transactions: %s, ptime: %dms", blockNumber, blockNumberHex, header.Time, gasTarget.String(), gasUsed.String(), blockReward.String(), blockTips.String(), baseFee.String(), blockBurned.String(), transactionCount.String(), duration)

	return blockStats, blockStatsPercentiles, baseFeeNextHex, nil
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
		false,
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
