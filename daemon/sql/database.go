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

	if !db.Migrator().HasTable(&BlockStatsPercentiles{}) {
		db.Migrator().CreateTable(&BlockStatsPercentiles{})
	}

	return &Database{
		db: db,
	}, nil
}

func (d *Database) AddBlock(blockStats BlockStats, blockStatsPercentiles []BlockStatsPercentiles) {
	if blockStats.Number == 0 {
		return
	}
	d.db.Create(blockStats)
	for _, b := range blockStatsPercentiles {
		d.db.Create(b)
	}
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

func (d *Database) GetMissingBlockNumbers(startingBlockNumber uint64) ([]uint64, error) {
	var blockStats []BlockStats
	var blockNumbers, missingBlockNumbers []uint64

	result := d.db.Find(&blockStats)
	if result.Error != nil {
		return missingBlockNumbers, result.Error
	}

	for _, b := range blockStats {
		blockNumbers = append(blockNumbers, uint64(b.Number))
	}

	for i := 1; i < len(blockNumbers); i++ {
		if blockNumbers[i]-blockNumbers[i-1] != 1 {
			for x := uint64(1); x < blockNumbers[i]-blockNumbers[i-1]; x++ {
				missingBlockNumber := blockNumbers[i-1] + x
				if missingBlockNumber > startingBlockNumber {
					missingBlockNumbers = append(missingBlockNumbers, missingBlockNumber)
				}
			}
		}
	}

	return missingBlockNumbers, nil
}

func (d *Database) GetTotals() (*big.Int, *big.Int, *big.Int, error) {
	var blockStats []BlockStats

	totalBurned := big.NewInt(0)
	totalIssuance := big.NewInt(0)
	totalTips := big.NewInt(0)

	result := d.db.Find(&blockStats)
	if result.Error != nil {
		return totalBurned, totalIssuance, totalTips, nil
	}

	for _, block := range blockStats {
		burned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			return totalBurned, totalIssuance, totalTips, fmt.Errorf("block.Burned was not a hex - %s", block.Burned)
		}
		totalBurned.Add(totalBurned, burned)

		rewards, err := hexutil.DecodeBig(block.Rewards)
		if err != nil {
			return totalBurned, totalIssuance, totalTips, fmt.Errorf("block.Rewards was not a hex - %s", block.Rewards)
		}
		totalIssuance.Add(totalIssuance, rewards)
		totalIssuance.Sub(totalIssuance, burned)

		tips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			return totalBurned, totalIssuance, totalTips, fmt.Errorf("block.Burned was not a hex - %s", block.Tips)
		}
		totalTips.Add(totalBurned, tips)
	}

	return totalBurned, totalIssuance, totalTips, nil
}
