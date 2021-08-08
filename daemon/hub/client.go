package hub

import (
	"crypto/rand"
	"encoding/json"
	"math/big"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

var (
	newline = []byte{'\n'}
)

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	mu sync.Mutex

	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte

	subscriptions map[string]*big.Int
}

// NewClient creates a new client.
func NewClient(
	hub *Hub,
	conn *websocket.Conn,
) *Client {
	return &Client{
		hub:           hub,
		conn:          conn,
		send:          make(chan []byte, 256),
		subscriptions: map[string]*big.Int{},
	}
}

func (c *Client) isSubscribedTo(subscription string) *big.Int {
	c.mu.Lock()
	defer c.mu.Unlock()

	return c.subscriptions[subscription]
}

func (c *Client) subscribeTo(subscription string) (*big.Int, error) {
	max := new(big.Int)
	max.Exp(big.NewInt(2), big.NewInt(130), nil).Sub(max, big.NewInt(1))

	//Generate cryptographically strong pseudo-random between 0 - max
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return nil, err
	}

	c.mu.Lock()
	defer c.mu.Unlock()

	c.subscriptions[subscription] = n

	return n, nil
}

func (c *Client) unsubscribeTo(subscriptionID *big.Int) (*big.Int, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	for subscription, n := range c.subscriptions {
		if n.Cmp(subscriptionID) == 0 {
			delete(c.subscriptions, subscription)
			break
		}
	}

	return big.NewInt(0), nil
}

// readPump pumps messages from the websocket connection to the hub.
//
// The application runs readPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) readPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })

	for {
		message := jsonrpcMessage{}
		err := c.conn.ReadJSON(&message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Errorf("error: %v\n", err)
			}
			break
		}

		b, err := json.Marshal(message)
		if err != nil {
			log.Error(err)
			continue
		}

		function, ok := c.hub.handlers[message.Method]
		if !ok {
			log.Errorf("Could not find handler for '%s'", message.Method)
			continue
		}

		result, err := function(c, message)
		if err != nil {
			log.Error(err)
			continue
		}

		b, err = json.Marshal(
			jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  result,
			},
		)
		if err != nil {
			log.Error(err)
			continue
		}

		select {
		case c.send <- b:
		default:
			close(c.send)
			delete(c.hub.clients, c)
		}

		continue
	}
}

// writePump pumps messages from the hub to the websocket connection.
//
// A goroutine running writePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()
	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}
