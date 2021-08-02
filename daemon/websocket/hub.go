package websocket

import (
	"context"
	"errors"
	"log"
	"math/big"
	"net/http"

	"github.com/ethereum/go-ethereum/ethclient"
	gethRPC "github.com/ethereum/go-ethereum/rpc"
)

// Hub maintains the set of active clients and broadcasts messages to the
// clients.
type Hub struct {
	// Registered clients.
	clients map[*Client]bool

	// Inbound messages from the clients.
	Broadcast chan []byte

	// Register requests from the clients.
	register chan *Client

	// Unregister requests from clients.
	unregister chan *Client

	chainID   big.Int
	networkID big.Int

	ethClient     *ethclient.Client
	gethRPCClient *gethRPC.Client
}

func NewHub(ctx context.Context, gethEndpoint string) (*Hub, error) {
	gethRPCClient, err := gethRPC.Dial(gethEndpoint)
	if err != nil {
		return nil, err
	}

	ethClient := ethclient.NewClient(gethRPCClient)
	// Add a method to clean-up and close clients in the event
	// of any connection failure.
	closeClients := func() {
		gethRPCClient.Close()
		ethClient.Close()
	}

	syncProg, err := ethClient.SyncProgress(ctx)
	if err != nil {
		closeClients()
		return nil, err
	}

	if syncProg != nil {
		closeClients()
		return nil, errors.New("eth1 node has not finished syncing yet")
	}

	// Make a simple call to ensure we are actually connected to a working node.
	chainID, err := ethClient.ChainID(ctx)
	if err != nil {
		closeClients()
		return nil, err
	}
	networkID, err := ethClient.NetworkID(ctx)
	if err != nil {
		closeClients()
		return nil, err
	}

	return &Hub{
		Broadcast:     make(chan []byte),
		register:      make(chan *Client),
		unregister:    make(chan *Client),
		clients:       make(map[*Client]bool),
		chainID:       *chainID,
		networkID:     *networkID,
		ethClient:     ethClient,
		gethRPCClient: gethRPCClient,
	}, nil
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
		case message := <-h.Broadcast:
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

func (h *Hub) ListenAndServe(addr string) error {
	go h.listen()

	http.HandleFunc("/ws", h.ServeWebSocket)

	err := http.ListenAndServe(addr, nil)
	if err != nil {
		return err
	}

	return nil
}

// ServeWebSocket handles websocket requests from the peer.
func (h *Hub) ServeWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{hub: h, conn: conn, send: make(chan []byte, 256)}
	client.hub.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}
