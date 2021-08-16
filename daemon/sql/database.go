package sql

import (

	//"github.com/ethereum/go-ethereum/core/types"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
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
	} else {
		db.Migrator().AutoMigrate(BlockStats{})
	}

	if !db.Migrator().HasTable(&BlockStatsPercentiles{}) {
		db.Migrator().CreateTable(&BlockStatsPercentiles{})
	} else {
		db.Migrator().AutoMigrate(BlockStats{})
	}

	return &Database{
		db: db,
	}, nil
}

func (d *Database) AddBlock(blockStats BlockStats, blockStatsPercentiles []BlockStatsPercentiles) {
	if blockStats.Number == 0 {
		return
	}
	d.db.Clauses(clause.OnConflict{
		UpdateAll: true,
	}).Create(blockStats)
	for _, b := range blockStatsPercentiles {
		d.db.Clauses(clause.OnConflict{
			UpdateAll: true,
		}).Create(b)
	}
}

func (d *Database) AddBlocks(blockStats []BlockStats, blockStatsPercentiles []BlockStatsPercentiles) {
	d.db.CreateInBatches(blockStats, len(blockStats))
	d.db.CreateInBatches(blockStatsPercentiles, len(blockStatsPercentiles))
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
