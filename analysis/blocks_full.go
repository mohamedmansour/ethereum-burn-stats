package main

import (
	"database/sql"
	"flag"
	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common/hexutil"
	_ "github.com/mattn/go-sqlite3"
	watchtheburn "github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"
)

var (
	dbPath = flag.String("db-path", "watchtheburn.db", "WatchTheBurn Database SQLite Path")
)

type WatchTheBurnBlockStat struct {
	Number            uint 
	Timestamp         uint64
	BaseFee           big.Int
	Burned            big.Int
	GasTarget         uint64
	GasUsed           uint64
	GasUsedPercentage float64
	PriorityFee       big.Int
	Rewards           big.Int
	Tips              big.Int
	Transactions      uint64
	Type2Transactions uint64
}

func main() {
	flag.Parse()

	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		panic(err)
	}

	queryCount := "SELECT number as count FROM block_stats ORDER BY number DESC LIMIT 1"
	rowCount, err := db.Query(queryCount)
	if err != nil {
		panic(err)
	}

	var count uint
	if rowCount.Next() {
		err = rowCount.Scan(&count)
		if err != nil {
			panic(err)
		}
	}

	queryAll := "SELECT * FROM block_stats"
	rows, err := db.Query(queryAll)
	if err != nil {
		panic(err)
	}

	blocksFull := BlocksFull{}
	blocksFull.Initialize(count)

	for rows.Next() {
		var cl watchtheburn.BlockStats
		err = rows.Scan(&cl.Number, &cl.Timestamp, &cl.BaseFee, &cl.Burned, &cl.GasTarget, &cl.GasUsed, &cl.PriorityFee, &cl.Rewards, &cl.Tips, &cl.Transactions, &cl.Type2Transactions)
		if err != nil {
			panic(err)
		}

		blocksFull.ProcessBlock(cl)
	}

	blocksFull.PrintPercentageFull(90)
	blocksFull.PrintPercentageFull(95)
	blocksFull.PrintPercentageFull(99)
}

const (
	FullTrackingBucket    = 100
	FullConsecutiveBucket = 200
	ConsecutiveCount      = 3
)

const (
	Wei   = 1
	GWei  = 1e9
	Ether = 1e18
)

type ComplexRecord struct {
	Total big.Int
	Min big.Int
	Max big.Int
}
type RecordStreak struct {
	StartBlock uint
	EndBlock uint
	Burned ComplexRecord
	Rewards ComplexRecord
	Tips ComplexRecord
	BaseFee ComplexRecord
	PriorityFee ComplexRecord
	TotalTransactions uint
	TotalType2Transactions uint
}

func (r *RecordStreak) Count() uint {
	return r.EndBlock - r.StartBlock
}

type BlocksFull struct {
	blocksFull map[int][]WatchTheBurnBlockStat
	currentStreaks map[int]*RecordStreak
	recordStreaks map[int]RecordStreak
	totalBlocks int
	latestBlock uint
}

func (b *BlocksFull) Initialize(count uint) {
	b.blocksFull = make(map[int][]WatchTheBurnBlockStat)
	b.currentStreaks = make(map[int]*RecordStreak)
	b.recordStreaks = make(map[int]RecordStreak)
	b.totalBlocks = 0
	b.latestBlock = count
}

func (b *BlocksFull) ProcessBlock(block watchtheburn.BlockStats) error {
	b.totalBlocks++

	blockstats, err := b.decodeBlockStats(block)
	if err != nil {
		return err
	}
	
	b.storePercentage(*blockstats, 90)
	b.storePercentage(*blockstats, 95)
	b.storePercentage(*blockstats, 99)

	return nil
}

func (b *BlocksFull) PrintPercentageFull(percentile int) {
	consecutivePercentile := percentile + FullConsecutiveBucket

	fullPercentiles := b.blocksFull[percentile]
	fullCount := len(fullPercentiles)
	percentageFull := float64(fullCount) / float64(b.totalBlocks) * 100

	consecutivePercentiles := b.blocksFull[consecutivePercentile]
	consecutiveCount := len(consecutivePercentiles)
	consecutiveFull := float64(consecutiveCount) / float64(b.totalBlocks) * 100

	recordStreak := b.recordStreaks[percentile]
	fmt.Printf(`
	>%d%% full:
		- %.2f%% blocks are full (%d/%d)
		- %.2f%% blocks are consecutive full 3+ (%d/%d)
		- Largest Streak (from %d to %d):
			- %d blocks
			- %.2f%% EIP-1559 transactions (%d/%d)
			- %.2fETH burned (%.2fETH min, %.2fETH max)
			- %.2fETH tips (%.2fETH min, %.2fETH max)
	`,	percentile, 
		percentageFull, fullCount, b.totalBlocks,
		consecutiveFull, consecutiveCount, fullCount,
		recordStreak.StartBlock, recordStreak.EndBlock,
		recordStreak.Count(),
		float64(recordStreak.TotalType2Transactions) / float64(recordStreak.TotalTransactions) * 100, recordStreak.TotalType2Transactions, recordStreak.TotalTransactions,
		b.formatEther(&recordStreak.Burned.Total), b.formatEther(&recordStreak.Burned.Min), b.formatEther(&recordStreak.Burned.Max),
		b.formatEther(&recordStreak.Tips.Total), b.formatEther(&recordStreak.Tips.Min), b.formatEther(&recordStreak.Tips.Max),
	)
}

func (b *BlocksFull) format(number *big.Int, precision float64) float64 {
	return (float64(number.Int64()) / precision)
}

func (b *BlocksFull) formatEther(number *big.Int) float64 {
	return b.format(number, Ether)
}

func (b *BlocksFull) formatGwei(number *big.Int) float64 {
	return b.format(number, GWei)
}

func (b *BlocksFull) storePercentage(block WatchTheBurnBlockStat, percentile int) {
	trackingPercentile := percentile + FullTrackingBucket
	consecutivePercentile := percentile + FullConsecutiveBucket
	clearTrackingPercentile := false

	b.updateCurrentStreak(block, percentile)

	if block.GasUsedPercentage > float64(percentile) {
		b.blocksFull[percentile] = append(b.blocksFull[percentile], block)
		b.blocksFull[trackingPercentile] = append(b.blocksFull[trackingPercentile], block) // Track consecutive full blocks
	} else {
		clearTrackingPercentile = true
	}

	// If the block is not consecutive full, add it to the consecutive blocks to track. This will be used to determine if the block is consecutive full.
	if clearTrackingPercentile || block.Number >= b.latestBlock {
		if len(b.blocksFull[trackingPercentile]) > ConsecutiveCount {
			streakCount := b.currentStreaks[percentile].Count()
			recordStreak := b.recordStreaks[percentile]
			if streakCount > recordStreak.Count() {
				b.recordStreaks[percentile] = *b.currentStreaks[percentile]
			}
			b.blocksFull[consecutivePercentile] = append(b.blocksFull[consecutivePercentile], block) // Mark consecutive full blocks
		}

		if clearTrackingPercentile {
			b.blocksFull[trackingPercentile] = nil
		}

		b.currentStreaks[percentile] = nil
	}
}

func (b *BlocksFull) updateCurrentStreak(block WatchTheBurnBlockStat, percentile int) {
	if b.currentStreaks[percentile] == nil {
		b.currentStreaks[percentile] = &RecordStreak{
			StartBlock: block.Number,
			EndBlock: block.Number,
			BaseFee: b.initializeComplexRecord(block.BaseFee),
			Burned: b.initializeComplexRecord(block.Burned),
			PriorityFee: b.initializeComplexRecord(block.PriorityFee),
			Rewards: b.initializeComplexRecord(block.Rewards),
			Tips: b.initializeComplexRecord(block.Tips),
			TotalTransactions: uint(block.Transactions),
			TotalType2Transactions: uint(block.Type2Transactions),
		}
	} else {
		currentStreak := b.currentStreaks[percentile]
		newStreak := &RecordStreak{
			StartBlock: currentStreak.StartBlock,
			EndBlock: block.Number,
			BaseFee: b.updateComplexRecord(currentStreak.BaseFee, block.BaseFee),
			Burned: b.updateComplexRecord(currentStreak.Burned, block.Burned),
			PriorityFee: b.updateComplexRecord(currentStreak.PriorityFee, block.PriorityFee),
			Rewards: b.updateComplexRecord(currentStreak.Rewards, block.Rewards),
			Tips: b.updateComplexRecord(currentStreak.Tips, block.Tips),
			TotalTransactions: currentStreak.TotalTransactions + uint(block.Transactions),
			TotalType2Transactions: currentStreak.TotalType2Transactions + uint(block.Type2Transactions),
		}
		b.currentStreaks[percentile] = newStreak
	}
}

func (b *BlocksFull) initializeComplexRecord(value big.Int) ComplexRecord {
	return ComplexRecord{
		Total: value,
		Min: value,
		Max: value,
	}
}

func (b *BlocksFull) updateComplexRecord(complex ComplexRecord, value big.Int) ComplexRecord {
	complex.Total.Add(&complex.Total, &value)
	if complex.Min.Cmp(&value) == 1 {
		complex.Min = value
	}
	if complex.Max.Cmp(&value) == -1 {
		complex.Max = value
	}
	return complex
}

func (b *BlocksFull) decodeBlockStats(block watchtheburn.BlockStats) (*WatchTheBurnBlockStat, error) {
	baseFee, err := hexutil.DecodeBig(block.BaseFee)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode BaseFee: %v", err)
	}

	burned, err := hexutil.DecodeBig(block.Burned)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode Burned: %v", err)
	}

	gasTarget, err := hexutil.DecodeUint64(block.GasTarget)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode GasTarget: %v", err)
	}

	gasUsed, err := hexutil.DecodeUint64(block.GasUsed)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode GasUsed: %v", err)
	}

	priorityFee, err := hexutil.DecodeBig(block.PriorityFee)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode PriorityFee: %v", err)
	}

	rewards, err := hexutil.DecodeBig(block.Rewards)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode Rewards: %v", err)
	}

	tips, err := hexutil.DecodeBig(block.Tips)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode Tips: %v", err)
	}

	transactions, err := hexutil.DecodeUint64(block.Transactions)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode Transactions: %v", err)
	}

	type2Transactions, err := hexutil.DecodeUint64(block.Type2Transactions)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode Type2Transactions: %v", err)
	}

	var gasUsedPercentage float64
	if gasTarget == 0 {
		gasUsedPercentage = 0.0
	} else {
		gasUsedPercentage = float64(gasUsed) / float64(gasTarget * 2) * 100
	}

	return &WatchTheBurnBlockStat{
		Number: block.Number,
		BaseFee: *baseFee,
		Burned: *burned,
		GasTarget: gasTarget,
		GasUsed: gasUsed,
		PriorityFee: *priorityFee,
		Rewards: *rewards,
		Tips: *tips,
		Transactions: transactions,
		Type2Transactions: type2Transactions,
		Timestamp: block.Timestamp,
		GasUsedPercentage: gasUsedPercentage,
	}, nil
}
