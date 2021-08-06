package sql

import (

	//"github.com/ethereum/go-ethereum/core/types"

	"fmt"
	"math/big"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

type Database struct {
	db *gorm.DB
}

func ConnectDatabase(dbPath string) (*Database, error) {
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		CreateBatchSize: 100,
	})
	if err != nil {
		return nil, err
	}

	if !db.Migrator().HasTable(&BlockStats{}) {
		db.Migrator().CreateTable(&BlockStats{})
	}

	return &Database{
		db: db,
	}, nil
}

func (d *Database) AddBlock(blockStats BlockStats) {
	if blockStats.Number == 0 {
		return
	}
	d.db.Create(blockStats)
}

func (d *Database) AddBlocks(blockStats []BlockStats) {
	d.db.CreateInBatches(blockStats, len(blockStats))
}

func (d *Database) GetHighestBlockNumber() (uint64, error) {
	var blockStats []BlockStats
	result := d.db.Last(&blockStats)
	if result.Error != nil {
		return 0, nil
	}

	highestBlockNumber := uint64(blockStats[0].Number)

	return highestBlockNumber, nil
}

func (d *Database) GetAllBlockStats() ([]BlockStats, error) {
	var blockStats []BlockStats

	result := d.db.Find(&blockStats)
	if result.Error != nil {
		return []BlockStats{}, nil
	}

	return blockStats, nil
}
func (d *Database) GetTotals() (*big.Int, *big.Int, error) {
	var blockStats []BlockStats

	totalBurned := big.NewInt(0)
	totalTips := big.NewInt(0)

	result := d.db.Find(&blockStats)
	if result.Error != nil {
		return totalBurned, totalTips, nil
	}

	for _, block := range blockStats {
		burned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			return totalBurned, totalTips, fmt.Errorf("block.Burned was not a hex - %s", block.Burned)
		}
		totalBurned.Add(totalBurned, burned)

		tips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			return totalBurned, totalTips, fmt.Errorf("block.Burned was not a hex - %s", block.Tips)
		}
		totalTips.Add(totalBurned, tips)
	}

	return totalBurned, totalTips, nil
}
