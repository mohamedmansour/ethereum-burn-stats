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

	// The channel to receive the jobs. All the workers will block until it receives a job.
	jobs chan transactionReceiptJob
}

func (h *TransactionReceiptWorker) Initialize() {
	h.jobs = make(chan transactionReceiptJob)

	// Start all the workers.
	for w := 1; w <= h.NumWorkers; w++ {
		go h.startWorker(w, h.jobs)
	}
}

func (h *TransactionReceiptWorker) QueueJob(transactions []string, blockNumber uint64, baseFee *big.Int, updateCache bool) ([]uint64, *big.Int, *big.Int, *big.Int) {
	// Open a channel to maka sure all the receipts are processed and we block on the result.
	results := make(chan transactionReceiptResult, len(transactions))

	// Enqueue the jobs.
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

	type2count := int64(0)
	// Wait for all the jobs to be processed.
	for a := 0; a < len(transactions); a++ {
		response := <-results

		if response.Error != nil {
			log.Errorln(response.Error)
			continue
		}

		if response.Result == nil {
			continue
		}

		if response.Result.Type == "0x2" {
			type2count++
		}

		allPriorityFeePerGasMwei = append(allPriorityFeePerGasMwei, response.Result.PriorityFeePerGas.Uint64())
		blockBurned.Add(blockBurned, response.Result.Burned)
		blockTips.Add(blockTips, response.Result.Tips)
	}

	// Return the aggregated results.
	return allPriorityFeePerGasMwei, blockBurned, blockTips, big.NewInt(type2count)
}

func (h *TransactionReceiptWorker) startWorker(id int, jobs <-chan transactionReceiptJob) {
	// Reuse the transport for each worker.
	tr := &http.Transport{}
	client := &http.Client{Transport: tr}
	rpcClient := &RPCClient{
		endpoint:   h.Endpoint,
		httpClient: client,
	}

	// Listen for jobs and process them.
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

	if tips.Sign() == -1 {
		log.Errorf("tips is negative, effectiveGasPrice=%s, gasUsed=%s, transactionHash=%s, blockNumber=%d", effectiveGasPrice.String(), gasUsed.String(), param.TransactionHash, param.BlockNumber)
	}

	priorityFeePerGas := big.NewInt(0)
	priorityFeePerGas.Div(tips, gasUsed)
	priorityFeePerGasMwei := priorityFeePerGas.Div(priorityFeePerGas, big.NewInt(1_000_000))

	return &transactionReceiptResponse{
		Burned:            burned,
		PriorityFeePerGas: priorityFeePerGasMwei,
		Tips:              tips,
		Type:              receipt.Type,
	}, nil
}

type transactionReceiptJob struct {
	BlockNumber     uint64
	BaseFee         *big.Int
	Results         chan transactionReceiptResult
	TransactionHash string
	UpdateCache     bool
}

type transactionReceiptResponse struct {
	Burned            *big.Int
	PriorityFeePerGas *big.Int
	Tips              *big.Int
	Type              string
}

type transactionReceiptResult struct {
	Result *transactionReceiptResponse
	Error  error
}
