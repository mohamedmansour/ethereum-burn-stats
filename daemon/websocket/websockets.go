package websocket

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
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
	space   = []byte{' '}
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
}

// Client is a middleman between the websocket connection and the hub.
type Client struct {
	hub *Hub

	// The websocket connection.
	conn *websocket.Conn

	// Buffered channel of outbound messages.
	send chan []byte
}

func (c *Client) unmarshal(raw interface{}, data interface{}) error {
	jsonString, err := json.Marshal(raw)
	if err != nil {
		return err
	}
	err = json.Unmarshal(jsonString, &data)
	return err
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
		fmt.Println(message)
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v\n", err)
			}
			break
		}

		fmt.Println(message.Method)
		switch message.Method {
		case "eth_chainId":
			chainID := toBlockNumArg(&c.hub.chainID)
			fmt.Println(chainID)

			// fmt.Println(fmt.Sprintf("0x%x", c.hub.chainID))
			b, err := json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  &chainID,
			})
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}

		case "eth_syncing":
			// TODO: context should be passed through?
			_, err := c.hub.ethClient.SyncProgress(context.Background())

			syncing := err != nil

			b, err := json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  &syncing,
			})
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}
		case "eth_blockNumber":
			// TODO: context should be passed through?
			blockNumber, err := c.hub.ethClient.BlockNumber(context.Background())
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			blockNumberString := hexutil.EncodeUint64(blockNumber)

			b, err := json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  &blockNumberString,
			})
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}
		case "eth_getBlockByNumber":
			b, err := message.Params.MarshalJSON()
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			type getBlockByNumberParams []interface{}
			var params getBlockByNumberParams
			err = json.Unmarshal(b, &params)
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			fmt.Println(params)
			blockNumberInterface := params[0]
			blockNumberString, ok := blockNumberInterface.(string)
			if !ok {
				log.Printf("could not cast: 'blockNumberInterface' %t to string\n", blockNumberInterface)
				break
			}
			blockNumber := new(big.Int)
			blockNumber, ok = blockNumber.SetString(strings.Replace(blockNumberString, "0x", "", -1), 16)
			if !ok {
				fmt.Println("SetString: error")
				break
			}
			fmt.Println(blockNumber)

			// block, err := c.hub.ethClient.BlockByNumber(context.Background(), blockNumber)
			// if err != nil {
			// 	log.Printf("error: %v\n", err)
			// 	break
			// }

			var raw json.RawMessage
			err = c.hub.gethRPCClient.CallContext(context.Background(), &raw, "eth_getBlockByNumber", toBlockNumArg(blockNumber), true)
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			var m map[string]interface{}
			if err := json.Unmarshal(raw, &m); err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			transactions := []interface{}{}

			transactionsBefore := m["transactions"].([]interface{})
			for _, transactionBefore := range transactionsBefore {
				transactionBeforeMap := transactionBefore.(map[string]interface{})

				// fmt.Println(transactionBeforeMap)
				// fmt.Println(reflect.TypeOf(transactionsBefore))
				transactions = append(transactions, transactionBeforeMap["hash"])
			}

			m["transactions"] = transactions

			// b, err = json.Marshal(m)
			// if err != nil {
			// 	log.Printf("error: %v\n", err)
			// 	break
			// }

			// type blockStruct struct {
			// 	ParentHash  common.Hash      `json:"parentHash"       gencodec:"required"`
			// 	UncleHash   common.Hash      `json:"sha3Uncles"       gencodec:"required"`
			// 	Coinbase    common.Address   `json:"miner"            gencodec:"required"`
			// 	Root        common.Hash      `json:"stateRoot"        gencodec:"required"`
			// 	TxHash      common.Hash      `json:"transactionsRoot" gencodec:"required"`
			// 	ReceiptHash common.Hash      `json:"receiptsRoot"     gencodec:"required"`
			// 	Bloom       types.Bloom      `json:"logsBloom"        gencodec:"required"`
			// 	Difficulty  common.Hash      `json:"difficulty"       gencodec:"required"`
			// 	Number      common.Hash      `json:"number"           gencodec:"required"`
			// 	GasLimit    string           `json:"gasLimit"         gencodec:"required"`
			// 	GasUsed     string           `json:"gasUsed"          gencodec:"required"`
			// 	Time        string           `json:"timestamp"        gencodec:"required"`
			// 	Extra       []byte           `json:"extraData"        gencodec:"required"`
			// 	MixDigest   common.Hash      `json:"mixHash"`
			// 	Nonce       types.BlockNonce `json:"nonce"`

			// 	Size            common.Hash   `json:"size"`
			// 	TotalDifficulty common.Hash   `json:"totalDifficulty"`
			// 	Transactions    []common.Hash `json:"transactions"`
			// 	Uncles          []common.Hash `json:"uncles"`
			// }

			// header := block.Header()

			// transactions := []common.Hash{}
			// for _, t := range block.Transactions() {
			// 	fmt.Println(t.Hash())
			// 	transactions = append(transactions, t.Hash())
			// }

			// // var buf []byte
			// // var tmp float64
			// // tmp = block.Size()
			// // n := math.Float64bits(tmp.(float64))
			// // buf[0] = byte(n >> 56)
			// // buf[1] = byte(n >> 48)
			// // buf[2] = byte(n >> 40)
			// // buf[3] = byte(n >> 32)
			// // buf[4] = byte(n >> 24)
			// // buf[5] = byte(n >> 16)
			// // buf[6] = byte(n >> 8)
			// // buf[7] = byte(n)

			// // size := common.BytesToHash(buf)
			// difficulty := common.BigToHash(block.Difficulty())

			// type extHeader struct {
			// 	types.Header
			// 	Transactions []common.Hash `json:"transactions"`
			// }

			// bl := extHeader{
			// 	types.Header{
			// 		ParentHash:  header.ParentHash,
			// 		UncleHash:   header.UncleHash,
			// 		Coinbase:    header.Coinbase,
			// 		Root:        header.Root,
			// 		TxHash:      header.TxHash,
			// 		ReceiptHash: header.ReceiptHash,
			// 		Bloom:       header.Bloom,
			// 		Difficulty:  header.Difficulty,
			// 		Number:      header.Number,
			// 		GasLimit:    header.GasLimit,
			// 		GasUsed:     header.GasUsed,
			// 		Time:        header.Time,
			// 		Extra:       header.Extra,
			// 		MixDigest:   header.MixDigest,
			// 		Nonce:       header.Nonce,
			// 	},

			// 	// Size:            size,
			// 	// TODO: wrong value
			// 	// TotalDifficulty: difficulty,
			// 	// Uncles:          []common.Hash{},
			// }
			// fmt.Println(bl)

			b, err = json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  m,
			})

			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}
		case "debug_getBlockReward":
			b, err := message.Params.MarshalJSON()
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			type getBlockByNumberParams []interface{}
			var params getBlockByNumberParams
			err = json.Unmarshal(b, &params)
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			// fmt.Println(params)
			blockNumberInterface := params[0]
			blockNumberString, ok := blockNumberInterface.(string)
			if !ok {
				log.Printf("could not cast: 'blockNumberInterface' %t to string\n", blockNumberInterface)
				break
			}
			blockNumber := new(big.Int)
			blockNumber, ok = blockNumber.SetString(strings.Replace(blockNumberString, "0x", "", -1), 16)
			if !ok {
				fmt.Println("SetString: error")
				break
			}
			// fmt.Println(blockNumber)

			// TODO: where do we get this from?
			blockReward := "0x1bc16d674ec80000"

			b, err = json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  &blockReward,
			})
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}
		case "eth_gasPrice":
			// TODO: is this the correct API?
			suggestGasPrice, err := c.hub.ethClient.SuggestGasPrice(context.Background())
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}
			fmt.Println(suggestGasPrice)

			suggestGasPriceHex := "0x0" // fmt.Sprintf("0x%x", suggestGasPrice)

			b, err := json.Marshal(jsonrpcMessage{
				Version: message.Version,
				ID:      message.ID,
				Result:  &suggestGasPriceHex,
			})
			if err != nil {
				log.Printf("error: %v\n", err)
				break
			}

			select {
			case c.send <- b:
			default:
				close(c.send)
				delete(c.hub.clients, c)
			}
		}

		// switch payload.Type {
		// case "message":
		// 	message := MessageCommand{}
		// 	err := c.unmarshal(payload.Value, &message)
		// 	if err != nil {
		// 		log.Printf("error: %v", err)
		// 		break
		// 	}
		// 	log.Println(message.Message)
		// }

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
