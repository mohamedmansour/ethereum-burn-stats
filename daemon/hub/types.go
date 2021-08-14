package hub

import "github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"

// Block type represents a single ethereum Block.
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

// TransactionLog type represents the transaction log.
type TransactionLog struct {
	Address          string   `json:"address"`
	Topics           []string `json:"topics"`
	Data             string   `json:"data"`
	BlockNumber      string   `json:"blockNumber"`
	TransactionHash  string   `json:"transactionHash"`
	TransactionIndex string   `json:"transactionIndex"`
	BlockHash        string   `json:"blockHash"`
	LogIndex         string   `json:"logIndex"`
	Removed          bool     `json:"removed"`
}

// TransactionReceipt type represents a single ethereum Transaction.
type TransactionReceipt struct {
	BlockHash         string           `json:"blockHash"`
	BlockNumber       string           `json:"blockNumber"`
	ContractAddress   interface{}      `json:"contractAddress"`
	CumulativeGasUsed string           `json:"cumulativeGasUsed"`
	EffectiveGasPrice string           `json:"effectiveGasPrice"`
	From              string           `json:"from"`
	GasUsed           string           `json:"gasUsed"`
	Logs              []TransactionLog `json:"logs"`
	LogsBloom         string           `json:"logsBloom"`
	Status            string           `json:"status"`
	To                string           `json:"to"`
	TransactionHash   string           `json:"transactionHash"`
	TransactionIndex  string           `json:"transactionIndex"`
	Type              string           `json:"type"`
}

// Totals type represents a single aggregate of all the data.
type Totals struct {
	Burned   string `json:"burned"`
	Issuance string `json:"issuance"`
	Rewards  string `json:"rewards"`
	Tips     string `json:"tipped"`
}

// InitialData type represents the initial data that the client requests.
type InitialData struct {
	Blocks      []sql.BlockStats `json:"blocks"`
	Clients     int16            `json:"clients"`
	Totals      Totals           `json:"totals"`
	BlockNumber uint64           `json:"blockNumber"`
	Version     string           `json:"version"`
}

// ClientData type represents the data that the server sends at every new block.
type BlockData struct {
	BaseFeeNext string         `json:"baseFeeNext"`
	Block       sql.BlockStats `json:"block"`
	Clients     int16          `json:"clients"`
	Totals      Totals         `json:"totals"`
	Version     string         `json:"version"`
}
