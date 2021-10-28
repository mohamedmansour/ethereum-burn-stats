package main

import (
	"database/sql"
	"flag"
	"fmt"
	"math/big"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
	_ "github.com/lib/pq"
	_ "github.com/mattn/go-sqlite3"

	watchtheburn "github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"
)

var (
	sqliteDbPath     = flag.String("sqlite-db-path", "watchtheburn.db", "SQLite Path")
	postgresHost     = flag.String("postgres-host", "localhost", "Postgres Host")
	postgresPort     = flag.Int("postgres-port", 5432, "Postgres Port")
	postgresUser     = flag.String("postgres-user", "", "Postgres User")
	postgresPassword = flag.String("postgres-password", "", "Postgres Password")
	postgresDatabase = flag.String("postgres-database", "", "Postgres Database")
)

func main() {
	flag.Parse()
	appStart := time.Now()
	
	// Connect to SQLite
	sqliteDb, err := sql.Open("sqlite3", *sqliteDbPath)
	if err != nil {
		panic(err)
	}

	// Connect to postgres
	psqlInfo := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable",
		*postgresHost, *postgresPort, *postgresUser, *postgresPassword, *postgresDatabase)

	postgreDb, err := sql.Open("postgres", psqlInfo)
	postgreDb.SetMaxIdleConns(100)
	postgreDb.SetMaxOpenConns(100)
	postgreDb.SetConnMaxLifetime(0)
	if err != nil {
		panic(err)
	}
	defer postgreDb.Close()

	err = postgreDb.Ping()
	if err != nil {
		panic(err)
	}

	// Make sure there are rows in the table.
	rowCount, err := sqliteDb.Query("SELECT number as count FROM block_stats ORDER BY number DESC LIMIT 1")
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

	// Find the latest block to start from.
	rowCount, err = postgreDb.Query("SELECT number as count FROM block_stats ORDER BY number DESC LIMIT 1")
	if err != nil {
		panic(err)
	}

	if rowCount.Next() {
		err = rowCount.Scan(&count)
		if err != nil {
			panic(err)
		}
	}

	fmt.Printf("Starting from block number %d\n", count)

	// Get all the blocks after the latest block stored.
	rows, err := sqliteDb.Query("SELECT * FROM block_stats WHERE number > $1", count)
	if err != nil {
		panic(err)
	}

	txn, err := postgreDb.Begin()
	if err != nil {
		panic(err)
	}

	insertStatement := "INSERT INTO block_stats(number, timestamp, gas_target, gas_used, gas_used_percentage, transactions, type2_transactions, base_fee, burned, priority_fee, rewards, tips) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (number) DO NOTHING"
	rowsAdded := 0
	start := time.Now()

	// Iterate over the rows and insert them into the postgres database.
	for rows.Next() {
		var cl watchtheburn.BlockStats
		err = rows.Scan(&cl.Number, &cl.Timestamp, &cl.BaseFee, &cl.Burned, &cl.GasTarget, &cl.GasUsed, &cl.PriorityFee, &cl.Rewards, &cl.Tips, &cl.Transactions, &cl.Type2Transactions)
		if err != nil {
			panic(err)
		}

		blockstats, err := decodeBlockStats(cl)
		if err != nil {
			panic(err)
		}

		_, psErr := txn.Exec(insertStatement,
			blockstats.Number,
			blockstats.Timestamp,
			blockstats.GasTarget,
			blockstats.GasUsed,
			int64(blockstats.GasUsedPercentage),
			blockstats.Transactions,
			blockstats.Type2Transactions,
			blockstats.BaseFee.String(),
			blockstats.Burned.String(),
			blockstats.PriorityFee.String(),
			blockstats.Rewards.String(),
			blockstats.Tips.String())

		if psErr != nil {
			panic(psErr)
		}

		rowsAdded++

		// Commit every 1000 rows.
		if rowsAdded % 1000 == 0 {
			fmt.Printf("%d blocks migrated in %vs\n", rowsAdded, time.Since(start).Seconds())
			err = txn.Commit()
			if err != nil {
				panic(err)
			}

			// Start a new transaction.
			txn, err = postgreDb.Begin()
			if err != nil {
				panic(err)
			}
			start = time.Now()
		}
	}
	
	// Commit the remaining.
	if rowsAdded == 0 {
		fmt.Printf("Nothing to migrate, upto date! Latest block at %d.\nCompleted in %vs\n", int(count), time.Since(start).Seconds())
	} else {
		fmt.Printf("%d blocks migrated in %vs\n", rowsAdded, time.Since(start).Seconds())
		fmt.Printf("Total of %d blocks migrated. Ended at block %d.\nCompleted in %vs\n", rowsAdded, rowsAdded + int(count), time.Since(appStart).Seconds())
	}

	err = txn.Commit()
	if err != nil {
		panic(err)
	}
}

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

func decodeBlockStats(block watchtheburn.BlockStats) (*WatchTheBurnBlockStat, error) {
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
		gasUsedPercentage = float64(gasUsed) / float64(gasTarget*2) * 100
	}

	return &WatchTheBurnBlockStat{
		Number:            block.Number,
		BaseFee:           *baseFee,
		Burned:            *burned,
		GasTarget:         gasTarget,
		GasUsed:           gasUsed,
		PriorityFee:       *priorityFee,
		Rewards:           *rewards,
		Tips:              *tips,
		Transactions:      transactions,
		Type2Transactions: type2Transactions,
		Timestamp:         block.Timestamp,
		GasUsedPercentage: gasUsedPercentage,
	}, nil
}
