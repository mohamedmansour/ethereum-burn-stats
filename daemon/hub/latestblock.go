package hub

import (
	"sync"
)

// LatestBlock defines a mutexed block number
type LatestBlock struct {
	blockNumber uint64
	mu          sync.Mutex
}

func newLatestBlock() *LatestBlock {
	return &LatestBlock{
		blockNumber: 0,
	}
}

func (lb *LatestBlock) getBlockNumber() uint64 {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	return lb.blockNumber
}

//func (lb *LatestBlock) lessEqualsLatestBlock(blockNumber *big.Int) bool {
//	lb.mu.Lock()
//	defer lb.mu.Unlock()
//
//	return lb.blockNumber.Cmp(blockNumber) >= 0
//}

func (lb *LatestBlock) updateBlockNumber(newBlockNumber uint64) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if newBlockNumber <= lb.blockNumber {
		// new number is same or smaller
		return
	}

	lb.blockNumber = newBlockNumber
}
