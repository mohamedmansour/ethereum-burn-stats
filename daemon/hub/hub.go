package hub

import (
	"net/http"

	"github.com/ethereum/go-ethereum/ethclient"
	gethRPC "github.com/ethereum/go-ethereum/rpc"
	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("prefix", "hub")

type Hub interface {
	ListenAndServe(addr string) error
}

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type hub struct {
	// Registered clients.
	clients map[*client]bool

	// Inbound messages from the clients.
	broadcast chan []byte

	// Register requests from the clients.
	register chan *client

	// Unregister requests from clients.
	unregister chan *client

	gethRPCClientHTTP *gethRPC.Client
	ethClientHTTP     *ethclient.Client

	ethClientWebsocket     *ethclient.Client
	gethRPCClientWebsocket *gethRPC.Client
}

func New(gethEndpointHTTP string, gethEndpointWebsocket string) (Hub, error) {
	gethRPCClientHTTP, err := gethRPC.DialHTTPWithClient(gethEndpointHTTP, new(http.Client))
	if err != nil {
		return nil, err
	}

	ethClientHTTP := ethclient.NewClient(gethRPCClientHTTP)

	gethRPCClientWebsocket, err := gethRPC.Dial(gethEndpointWebsocket)
	if err != nil {
		return nil, err
	}

	ethClientWebsocket := ethclient.NewClient(gethRPCClientWebsocket)

	return &hub{
		broadcast:  make(chan []byte),
		register:   make(chan *client),
		unregister: make(chan *client),
		clients:    make(map[*client]bool),

		gethRPCClientWebsocket: gethRPCClientWebsocket,
		ethClientWebsocket:     ethClientWebsocket,

		gethRPCClientHTTP: gethRPCClientHTTP,
		ethClientHTTP:     ethClientHTTP,
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
		case message := <-h.broadcast:
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
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
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}

	client := &client{hub: h, conn: conn, send: make(chan []byte, 256)}
	h.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
