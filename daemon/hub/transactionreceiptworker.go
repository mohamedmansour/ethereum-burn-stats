package hub

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"strconv"

	"github.com/ethereum/go-ethereum/common/hexutil"
)

type TransactionReceiptWorker struct {
	NumWorkers int
	Endpoint   string

	jobs       chan transactionReceiptJob
}

func (h *TransactionReceiptWorker) Initialize() {
	h.jobs = make(chan transactionReceiptJob)

	for w := 1; w <= h.NumWorkers; w++ {
		go h.startWorker(w, h.jobs)
	}
}

func (h *TransactionReceiptWorker) QueueJob(transactions []string, blockNumber uint64, baseFee *big.Int, updateCache bool) ([]uint64, *big.Int, *big.Int) {
	results := make(chan transactionReceiptResult, len(transactions))

	for _, tHash := range transactions {
		h.jobs <- transactionReceiptJob{
			Results:         results,
			BlockNumber:     blockNumber,
			TransactionHash: tHash,
			BaseFee:         baseFee,
			UpdateCache:     updateCache,
		}
	}

	var allPriorityFeePerGasMwei []uint64
	blockBurned := big.NewInt(0)
	blockTips := big.NewInt(0)

	for a := 0; a < len(transactions); a++ {
		response := <-results

		if response.Error != nil {
			log.Errorln(response.Error)
			continue
		}

		if response.Result == nil {
			continue
		}

		allPriorityFeePerGasMwei = append(allPriorityFeePerGasMwei, response.Result.PriorityFeePerGas.Uint64())
		blockBurned.Add(blockBurned, response.Result.Burned)
		blockTips.Add(blockTips, response.Result.Tips)
	}

	return allPriorityFeePerGasMwei, blockBurned, blockTips
}

func (h *TransactionReceiptWorker) startWorker(id int, jobs <-chan transactionReceiptJob) {
	rpcClient := &RPCClient{
		endpoint:   h.Endpoint,
		httpClient: new(http.Client),
	}

	for j := range jobs {
		response, err := h.processTransactionReceipt(rpcClient, j)
		j.Results <- transactionReceiptResult{Result: response, Error: err}
	}
}

func (h *TransactionReceiptWorker) processTransactionReceipt(rpcClient *RPCClient, param transactionReceiptJob) (*transactionReceiptResponse, error) {
	raw, err := rpcClient.CallContext(
		"2.0",
		"eth_getTransactionReceipt",
		strconv.Itoa(int(param.BlockNumber)),
		param.UpdateCache,
		param.TransactionHash,
	)

	if err != nil {
		return nil, fmt.Errorf("error getting transaction receipt: %v", err)
	}

	receipt := TransactionReceipt{}
	err = json.Unmarshal(raw, &receipt)
	if err != nil {
		return nil, fmt.Errorf("error unmarshalling transaction receipt: %v", err)
	}

	if receipt.BlockNumber == "" {
		log.Warnf("block %d, transaction %s: found empty transaction receipt", param.BlockNumber, param.TransactionHash)
		return nil, nil
	}

	gasUsed, err := hexutil.DecodeBig(receipt.GasUsed)
	if err != nil {
		return nil, fmt.Errorf("error decoding gas used: %v", err)
	}

	effectiveGasPrice := big.NewInt(0)

	if receipt.EffectiveGasPrice != "" {
		effectiveGasPrice, err = hexutil.DecodeBig(receipt.EffectiveGasPrice)
		if err != nil {
			return nil, fmt.Errorf("error decoding effective gas price: %v", err)
		}
	}

	burned := big.NewInt(0)
	burned.Mul(gasUsed, param.BaseFee)

	tips := big.NewInt(0)
	tips.Mul(gasUsed, effectiveGasPrice)
	tips.Sub(tips, burned)

	priorityFeePerGas := big.NewInt(0)
	priorityFeePerGas.Div(tips, gasUsed)
	priorityFeePerGasMwei := priorityFeePerGas.Div(priorityFeePerGas, big.NewInt(1_000_000))

	return &transactionReceiptResponse{
		Burned:            burned,
		Tips:              tips,
		PriorityFeePerGas: priorityFeePerGasMwei,
	}, nil
}

type transactionReceiptJob struct {
	Results         chan transactionReceiptResult
	TransactionHash string
	BlockNumber     uint64
	BaseFee         *big.Int
	UpdateCache     bool
}

type transactionReceiptResponse struct {
	Burned            *big.Int
	Tips              *big.Int
	PriorityFeePerGas *big.Int
}

type transactionReceiptResult struct {
	Result *transactionReceiptResponse
	Error  error
}
