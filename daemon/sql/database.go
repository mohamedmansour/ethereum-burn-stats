package sql

import (
	//"github.com/ethereum/go-ethereum/core/types"
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
	d.db.Create(blockStats)
}

func (d *Database) AddBlocks(blockStats []BlockStats) {
	d.db.CreateInBatches(blockStats, len(blockStats))
}

func (d *Database) GetHighestBlock() (uint, error) {
	var blockStats []BlockStats
	result := d.db.Last(&blockStats)
	if result.Error != nil {
		return 0, nil
	}

	return blockStats[0].Number, nil
}

