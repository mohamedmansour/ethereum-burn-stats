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
	"blockStats":   true,
	"clientsCount": true,
	"data":         true,
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

	// used to track repeated blocks
	blockRepeated bool

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
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
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
		"internal_getInitialData": h.handleInitialData(),
		"eth_syncing":             h.ethSyncing(),

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

	go func() {
		for {
			select {
			case err := <-sub.Err():
				log.Errorln("Error: ", err)
			case header := <-headers:
				// clientsCount is quantity of active subscriptions/users
				clientsCount := len(h.clients)

				// latestBlockNumber is highest processed block to date
				latestBlockNumber := h.s.latestBlock.getBlockNumber()

				// determine if new block message is repeat of previous block
				blockNumber := header.Number.Uint64()
				if latestBlockNumber == blockNumber {
					h.blockRepeated = true
					log.Warnf("block %s repeated", header.Number.String())
					continue
				}

				// reprocess previous block if it had been repeated
				for h.blockRepeated {
					h.blockRepeated = false
					prevBlockNumber := blockNumber - 1

					// fetch previous block, process stats, and update stats if changed
					blockStats, err := h.s.processBlock(prevBlockNumber, true)
					if err != nil {
						log.Errorf("processBlock(%d, true): %v", prevBlockNumber, err)
						continue
					} else if blockStats.Number == 0 {
						// repeated block unchanged
						continue
					}

					//get totals for previous block
					totals, err := h.s.getTotals(prevBlockNumber)
					if err != nil {
						log.Errorf("getTotals(%d): %v", prevBlockNumber, err)
						continue
					}

					prevBlockTimestamp, err := h.s.getBlockTimestamp(prevBlockNumber)
					if err != nil {
						log.Errorf("getBlockTimestamp(%d): %v", prevBlockNumber, err)
					}

					// get totals stats for previous block from 30 days prior
					totalsMonth, err := h.s.getTotalsTimeDelta(prevBlockTimestamp-30*86400, prevBlockTimestamp)
					if err != nil {
						log.Errorf("getTotalsTimeDelta(%d,%d): %v", prevBlockTimestamp-30*86400, prevBlockTimestamp, err)
						continue
					}

					// get totals stats for previous block from 7 days prior
					totalsWeek, err := h.s.getTotalsTimeDelta(prevBlockTimestamp-7*86400, prevBlockTimestamp)
					if err != nil {
						log.Errorf("getTotalsTimeDelta(%d,%d): %v", prevBlockTimestamp-7*86400, prevBlockTimestamp, err)
						continue
					}

					// get totals stats for previous block from 24 hours prior
					totalsDay, err := h.s.getTotalsTimeDelta(prevBlockTimestamp-86400, prevBlockTimestamp)
					if err != nil {
						log.Errorf("getTotalsTimeDelta(%d,%d): %v", prevBlockTimestamp-86400, prevBlockTimestamp, err)
						continue
					}

					// get totals stats for previous block from 1 hour prior
					totalsHour, err := h.s.getTotalsTimeDelta(prevBlockTimestamp-3600, prevBlockTimestamp)
					if err != nil {
						log.Errorf("getTotalsTimeDelta(%d,%d): %v", prevBlockTimestamp-3600, prevBlockTimestamp, err)
						continue
					}

					//get baseFeeNext for previous block
					baseFeeNext, err := h.s.getBaseFeeNext(prevBlockNumber)
					if err != nil {
						log.Errorf("getBaseFeeNext(%d): %v", prevBlockNumber, err)
						continue
					}

					// skip broadcast if block unchanged
					if blockStats.Number != 0 {
						// broadcast updated block to subscribers
						h.subscription <- map[string]interface{}{
							"blockStats":   blockStats,
							"clientsCount": clientsCount,
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
								USDPrice:    h.usd.Price,
							},
						}
						time.Sleep(100 * time.Millisecond)
					}
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

				// get totals stats for current block from 30 days prior
				totalsMonth, err := h.s.getTotalsTimeDelta(header.Time-30*86400, header.Time)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", header.Time-30*86400, header.Time, err)
					continue
				}

				// get totals stats for current block from 7 days prior
				totalsWeek, err := h.s.getTotalsTimeDelta(header.Time-7*86400, header.Time)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", header.Time-7*86400, header.Time, err)
					continue
				}

				// get totals stats for current block from 24 hours prior
				totalsDay, err := h.s.getTotalsTimeDelta(header.Time-86400, header.Time)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", header.Time-86400, header.Time, err)
					continue
				}

				// get totals stats for current block from 1 hour prior
				totalsHour, err := h.s.getTotalsTimeDelta(header.Time-3600, header.Time)
				if err != nil {
					log.Errorf("getTotalsTimeDelta(%d,%d): %v", header.Time-3600, header.Time, err)
					continue
				}

				// get baseFeeNext for current block
				baseFeeNext, err := h.s.getBaseFeeNext(blockNumber)
				if err != nil {
					log.Errorf("getBaseFeeNext(%d): %v", blockNumber, err)
					continue
				}

				// broadcast new block to subscribers
				h.subscription <- map[string]interface{}{
					"blockStats":   blockStats,
					"clientsCount": clientsCount,
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
						USDPrice:    h.usd.Price,
					},
				}
			}
		}
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

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		blockCount, ok := params[0].(float64)
		if !ok {
			return nil, fmt.Errorf("block count is not a number - %s", params[0])
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
			Blocks:      h.s.latestBlocks.getBlocks(int(blockCount)),
			Clients:     int16(len(h.clients)),
			Totals:      totals,
			TotalsDay:   totalsDay,
			TotalsHour:  totalsHour,
			TotalsMonth: totalsMonth,
			TotalsWeek:  totalsWeek,
			Version:     version.Version,
			USDPrice:    h.usd.Price,
		}

		dataJSON, err := json.Marshal(data)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(dataJSON), nil
	}
}
