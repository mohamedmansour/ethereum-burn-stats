package main

import (
	"database/sql"
	"flag"
	"fmt"

	"github.com/ethereum/go-ethereum/common/hexutil"
	_ "github.com/mattn/go-sqlite3"
)

var (
	dbPath = flag.String("db-path", "watchtheburn.db", "WatchTheBurn Database SQLite Path")
)

type BlockStats struct {
	Number            uint   `json:"number" gorm:"primaryKey;autoIncrement:false"`
	Timestamp         uint64 `json:"timestamp"`
	BaseFee           string `json:"baseFee"`
	Burned            string `json:"burned"`
	GasTarget         string `json:"gasTarget"`
	GasUsed           string `json:"gasUsed"`
	PriorityFee       string `json:"priorityFee"`
	Rewards           string `json:"rewards"`
	Tips              string `json:"tips"`
	Transactions      string `json:"transactions"`
	Type2Transactions string `json:"type2transactions"`
}

func main() {
	flag.Parse()

	db, err := sql.Open("sqlite3", *dbPath)
	if err != nil {
		panic(err)
	}

	queryAll := "SELECT * FROM block_stats"
	rows, err := db.Query(queryAll)
	if err != nil {
		panic(err)
	}

	blocksFull := make(map[int]int)
	totalBlocks := 0

	for rows.Next() {
		totalBlocks++

		var cl BlockStats
		err = rows.Scan(&cl.Number, &cl.Timestamp, &cl.BaseFee, &cl.Burned, &cl.GasTarget, &cl.GasUsed, &cl.PriorityFee, &cl.Rewards, &cl.Tips, &cl.Transactions, &cl.Type2Transactions)
		if err != nil {
			panic(err)
		}

		percentage, err := ProcessPercentage(cl)
		if err != nil {
			panic(err)
		}
		
		StorePercentage(*percentage, 190, blocksFull)
		StorePercentage(*percentage, 195, blocksFull)
		StorePercentage(*percentage, 199, blocksFull)
	}

	PrintPercentageFull(190, blocksFull, totalBlocks)
	PrintPercentageFull(195, blocksFull, totalBlocks)
	PrintPercentageFull(199, blocksFull, totalBlocks)
}

func StorePercentage(percentage float64, percentile int, blocksFull map[int]int) {
	if percentage > float64(percentile) {
		blocksFull[percentile]++
		blocksFull[percentile + 100]++ // Track consecutive full blocks
	
		if blocksFull[percentile + 100] > 3 {
			blocksFull[percentile + 200]++ // Mark consecutive full blocks
		}
	} else {
		blocksFull[percentile + 100] = 0 // Reset consecutive full blocks
	}
}

func PrintPercentageFull(percentile int, blocksFull map[int]int, totalBlocks int) {
	fullCount := blocksFull[percentile]
	percentageFull := float64(fullCount) / float64(totalBlocks) * 100
	consecutiveCount := blocksFull[percentile+200]
	consecutiveFull := float64(consecutiveCount) / float64(totalBlocks) * 100
	percentileNormalized := percentile - 100
	fmt.Printf("%d percentile: %d/%d (%.2f%%) blocks are full. %d/%d (%.2f%%) consecutive full.\n", percentileNormalized, fullCount, totalBlocks, percentageFull, consecutiveCount, fullCount, consecutiveFull)
}

func ProcessPercentage(block BlockStats) (*float64, error) {
	gasUsed, err := hexutil.DecodeUint64(block.GasUsed)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode GasUsed: %v", err)
	}
	gasTarget, err := hexutil.DecodeUint64(block.GasTarget)
	if err != nil {
		return nil, fmt.Errorf("couldn't decode GasTarget: %v", err)
	}

	if gasTarget == 0 {
		percentage := 0.0;
		return &percentage, nil
	}

	percentage := (float64(gasUsed) / float64(gasTarget) * 100)
	return &percentage, nil
}
