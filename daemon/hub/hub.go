package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	gethRPC "github.com/ethereum/go-ethereum/rpc"
	"github.com/gorilla/websocket"
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/version"
	"github.com/sirupsen/logrus"
)

var log = logrus.StandardLogger()

var allowedEthSubscriptions = map[string]bool{
	"data":           true,
	"aggregatesData": true,
}

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

	// block stats and totals
	s *Stats

	usd *USDPriceWatcher
}

// New initializes a Hub instance.
func New(
	debug bool,
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
	dbPath string,
	ropsten bool,
	workerCount int,
) (*Hub, error) {
	upgrader := &websocket.Upgrader{
		ReadBufferSize:    1024,
		WriteBufferSize:   1024,
	}

	if debug {
		log.SetLevel(logrus.DebugLevel)
	}

	if development {
		upgrader.CheckOrigin = func(r *http.Request) bool {
			return true
		}
	}

	subscription := make(chan map[string]interface{})
	clients := make(map[*Client]bool)

	s := &Stats{}
	usd := &USDPriceWatcher{}

	h := &Hub{
		upgrader: upgrader,

		subscription: subscription,
		register:     make(chan *Client),
		unregister:   make(chan *Client),
		clients:      clients,
		s:            s,
		usd:          usd,
	}

	s.initialize(gethEndpointHTTP, dbPath, ropsten, workerCount)

	h.initializeWebSocketHandlers()
	err := h.initializeGrpcWebSocket(gethEndpointWebsocket)
	if err != nil {
		return nil, err
	}

	// Run this in a goroutine so it doesn't block the websocket from working.
	go usd.StartWatching()

	return h, nil
}

func (h *Hub) initializeWebSocketHandlers() {
	h.handlers = map[string]func(c *Client, message jsonrpcMessage) (json.RawMessage, error){

		// internal custom geth commands.
		"internal_getInitialData":           h.handleInitialData(),
		"internal_getInitialAggregatesData": h.handleInitialAggregatesData(),
		"eth_syncing":                       h.ethSyncing(),

		// proxy to geth

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
		return fmt.Errorf("WebSocket cannot subscribe to newHeads: %v", err)
	}

	error_chan := make(chan bool)

	go func() {
		for {
			select {
			case err := <-sub.Err():
				log.Errorln("Geth WS Error: ", err)
				time.Sleep(12 * time.Second)
				error_chan <- true
				return
				
			case header := <-headers:
				// clientsCount is quantity of active subscriptions/users
				clientsCount := len(h.clients)

				// latestBlockNumber is highest processed block to date
				latestBlockNumber := h.s.latestBlock.getBlockNumber()

				// Only process the previously found block instead of the latest block.
				// This will make the hub discover the block slower but it will prevent
				// the hub from processing the same block twice.
				blockNumber := header.Number.Uint64() - 1

				if blockNumber <= latestBlockNumber {
					log.Warnf("block %s repeated", header.Number.String())
					continue
				}

				// fetch current block, process stats, and update stats
				blockStats, err := h.s.processBlock(blockNumber, false)
				if err != nil {
					log.Errorf("processBlock(%d, true): %v", blockNumber, err)
					continue
				}

				// get totals stats for current block
				totals, err := h.s.getTotals(blockNumber)
				if err != nil {
					log.Errorf("getTotals(%d): %v", blockNumber, err)
					continue
				}
				
				blockTime, err := h.s.getBlockTimestamp(blockNumber)
				if err != nil {
					log.Errorf("getBlockTimestamp(%d): %v", blockNumber, err)
					continue
				}

				// get totals stats for current block from 30 days prior
				totalsMonth, err := h.s.getTotalsTimeDelta(blockTime-30*86400, blockTime)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTime-30*86400, blockTime, err)
					continue
				}

				// get totals stats for current block from 7 days prior
				totalsWeek, err := h.s.getTotalsTimeDelta(blockTime-7*86400, blockTime)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTime-7*86400, blockTime, err)
					continue
				}

				// get totals stats for current block from 24 hours prior
				totalsDay, err := h.s.getTotalsTimeDelta(blockTime-86400, blockTime)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTime-86400, blockTime, err)
					continue
				}

				// get totals stats for current block from 1 hour prior
				totalsHour, err := h.s.getTotalsTimeDelta(blockTime-3600, blockTime)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTime-3600, blockTime, err)
					continue
				}

				// get baseFeeNext for current block
				baseFeeNext, err := h.s.getBaseFeeNext(blockNumber)
				if err != nil {
					log.Errorf("getBaseFeeNext(%d): %v", blockNumber, err)
					continue
				}

				h.s.updateAggregateTotals(blockNumber)

				// broadcast new block to subscribers
				h.subscription <- map[string]interface{}{
					"data": &BlockData{
						BaseFeeNext: baseFeeNext,
						Block:       blockStats,
						Clients:     int16(clientsCount),
						Totals:      totals,
						TotalsDay:   totalsDay,
						TotalsHour:  totalsHour,
						TotalsMonth: totalsMonth,
						TotalsWeek:  totalsWeek,
						Version:     version.Version,
						USDPrice:    h.usd.GetPrice(),
					},
					"aggregatesData": &AggregatesData{
						TotalsPerDay:   h.s.totalsPerDay.getTotals(1),
						TotalsPerHour:  h.s.totalsPerHour.getTotals(1),
						TotalsPerMonth: h.s.totalsPerMonth.getTotals(1),
					},
				}
			}
		}
	}()

	go func() {
		<-error_chan
		log.Errorln("Reconnecting to Geth WS")
		h.initializeGrpcWebSocket(gethEndpointWebsocket)
	}()
	
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

func (h *Hub) ethSyncing() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		if h.s.ethSyncing != nil {
			syncJson, err := json.Marshal(h.s.ethSyncing)
			return json.RawMessage(syncJson), err
		} else {
			return json.RawMessage("false"), nil
		}
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

func (h *Hub) handleInitialAggregatesData() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

		var periodCount int
		if len(params) == 0 {
			periodCount = 300
		} else {
			periodCountFloat, ok := params[0].(float64)
			if !ok {
				return nil, fmt.Errorf("block count is not a number - %s", params[0])
			}
			periodCount = int(periodCountFloat)
		}

		data := &AggregatesData{
			TotalsPerDay:   h.s.totalsPerDay.getTotals(periodCount),
			TotalsPerHour:  h.s.totalsPerHour.getTotals(periodCount),
			TotalsPerMonth: h.s.totalsPerMonth.getTotals(periodCount),
		}

		dataJSON, err := json.Marshal(data)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(dataJSON), nil
	}
}

func (h *Hub) handleInitialData() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
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

		var blockCount int
		if len(params) == 0 {
			blockCount = 300
		} else {
			blockCountFloat, ok := params[0].(float64)
			if !ok {
				return nil, fmt.Errorf("block count is not a number - %s", params[0])
			}
			blockCount = int(blockCountFloat)
		}

		blockNumber := h.s.latestBlock.getBlockNumber()
		totals, err := h.s.getTotals(blockNumber)
		if err != nil {
			log.Errorf("Error calling getTotals: %vn", err)
		}

		blockTimestamp, err := h.s.getBlockTimestamp(blockNumber)
		if err != nil {
			log.Errorf("getBlockTimestamp(%d): %v", blockNumber, err)
		}

		// get totals stats for current block from 30 days prior
		totalsMonth, err := h.s.getTotalsTimeDelta(blockTimestamp-30*86400, blockTimestamp)
		if err != nil {
			log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTimestamp-30*86400, blockTimestamp, err)
		}

		// get totals stats for current block from 7 days prior
		totalsWeek, err := h.s.getTotalsTimeDelta(blockTimestamp-7*86400, blockTimestamp)
		if err != nil {
			log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTimestamp-7*86400, blockTimestamp, err)
		}

		// get totals stats for current block from 24 hours prior
		totalsDay, err := h.s.getTotalsTimeDelta(blockTimestamp-86400, blockTimestamp)
		if err != nil {
			log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTimestamp-86400, blockTimestamp, err)
		}

		// get totals stats for current block from 1 hour prior
		totalsHour, err := h.s.getTotalsTimeDelta(blockTimestamp-3600, blockTimestamp)
		if err != nil {
			log.Errorf("getTotalsTimeDelta(%d,%d): %v", blockTimestamp-3600, blockTimestamp, err)
		}

		data := &InitialData{
			BlockNumber: h.s.latestBlock.getBlockNumber(),
			Blocks:      h.s.latestBlocks.getBlocks(blockCount),
			Clients:     int16(len(h.clients)),
			Totals:      totals,
			TotalsDay:   totalsDay,
			TotalsHour:  totalsHour,
			TotalsMonth: totalsMonth,
			TotalsWeek:  totalsWeek,
			Version:     version.Version,
			USDPrice:    h.usd.GetPrice(),
		}

		dataJSON, err := json.Marshal(data)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(dataJSON), nil
	}
}
