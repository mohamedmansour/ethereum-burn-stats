package hub

import (
	"math/big"
	"sync"
)

type LatestBlock struct {
	blockNumber *big.Int
	mu          sync.Mutex
}

func newLatestBlock() *LatestBlock {
	return &LatestBlock{
		blockNumber: new(big.Int).SetUint64(0),
	}
}

func (lb *LatestBlock) getBlockNumber() big.Int {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	return *lb.blockNumber
}

func (lb *LatestBlock) lessEqualsLatestBlock(blockNumber *big.Int) bool {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	return lb.blockNumber.Cmp(blockNumber) >= 0
}

func (lb *LatestBlock) updateBlockNumber(newBlockNumber *big.Int) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if lb.blockNumber.Cmp(newBlockNumber) >= 0 {
		// new number is smaller
		return
	}

	lb.blockNumber = newBlockNumber
}
