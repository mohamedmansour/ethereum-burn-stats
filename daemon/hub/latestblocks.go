package hub

import (
	"sync"

	"github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"
)

// LatestBlocks defines a mutexed list of latest blocks
type LatestBlocks struct {
	blocks    []sql.BlockStats
	mu        sync.Mutex
	maxBlocks int
}

func newLatestBlocks(maxBlocks int) *LatestBlocks {
	return &LatestBlocks{
		blocks:    []sql.BlockStats{},
		maxBlocks: maxBlocks,
	}
}

func (lb *LatestBlocks) getBlocks(blockCount int) []sql.BlockStats {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if len(lb.blocks) > blockCount {
		return lb.blocks[0:blockCount]
	}

	return lb.blocks
}

func (lb *LatestBlocks) addBlock(block sql.BlockStats, duplicateBlock bool) {
	lb.mu.Lock()
	defer lb.mu.Unlock()

	if duplicateBlock {
		log.Infof("block %d replaced", block.Number)
		lb.blocks = lb.blocks[1:]
	}

	sliceEnd := lb.maxBlocks
	if len(lb.blocks) < lb.maxBlocks {
		sliceEnd = len(lb.blocks) + 1
	}

	lb.blocks = append([]sql.BlockStats{block}, lb.blocks...)[:sliceEnd]
}
