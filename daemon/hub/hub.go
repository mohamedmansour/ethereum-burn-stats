package hub

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	gethRPC "github.com/ethereum/go-ethereum/rpc"
	"github.com/gorilla/websocket"
	"github.com/sirupsen/logrus"
)

var log = logrus.StandardLogger()

var allowedEthSubscriptions = map[string]bool{
	"newHeads": true,
}

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

	handlers map[string]func(c *client, message jsonrpcMessage) (interface{}, error)
}

func New(
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
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

	subscription := make(chan map[string]interface{})

	gethRPCClientHTTP, err := gethRPC.DialHTTPWithClient(gethEndpointHTTP, new(http.Client))
	if err != nil {
		return nil, err
	}

	gethRPCClientWebsocket, err := gethRPC.Dial(gethEndpointWebsocket)
	if err != nil {
		return nil, err
	}

	// ethClientWebsocket := ethclient.NewClient(gethRPCClientWebsocket)

	headers := make(chan *types.Header)
	sub, err := gethRPCClientWebsocket.EthSubscribe(context.Background(), headers, "newHeads")
	if err != nil {
		return nil, err
	}

	go func() {
		for {
			select {
			case err := <-sub.Err():
				log.Errorln("Error: ", err)
			case header := <-headers:
				log.Infoln("New block: ", header.Number)
				subscription <- map[string]interface{}{
					"newHeads": header,
				}
			}
		}
	}()

	handlers := map[string]func(c *client, message jsonrpcMessage) (interface{}, error){
		"debug_getBlockReward": handleFunc(gethRPCClientHTTP),

		"eth_blockNumber":      handleFunc(gethRPCClientHTTP),
		"eth_chainId":          handleFunc(gethRPCClientHTTP),
		"eth_gasPrice":         handleFunc(gethRPCClientHTTP),
		"eth_getBlockByNumber": handleFunc(gethRPCClientHTTP),
		"eth_syncing":          handleFunc(gethRPCClientHTTP),

		"eth_subscribe": ethSubscribe(),
	}

	return &hub{
		upgrader: upgrader,

		subscription: subscription,
		register:     make(chan *client),
		unregister:   make(chan *client),
		clients:      make(map[*client]bool),

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

					log.Println(string(b))

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
	gethRPCClientHTTP *gethRPC.Client,
) func(c *client, message jsonrpcMessage) (interface{}, error) {
	return func(c *client, message jsonrpcMessage) (interface{}, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		var raw json.RawMessage
		err = gethRPCClientHTTP.CallContext(context.Background(), &raw, message.Method, params...)
		if err != nil {
			return nil, err
		}

		return raw, nil
	}
}

func ethSubscribe() func(c *client, message jsonrpcMessage) (interface{}, error) {
	return func(c *client, message jsonrpcMessage) (interface{}, error) {
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

		return toBlockNumArg(subscrptionID), nil
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
