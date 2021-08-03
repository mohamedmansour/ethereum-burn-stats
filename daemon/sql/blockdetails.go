package sql

type BlockDetails struct {
	Block        uint `gorm:"primaryKey;autoIncrement:false"`
	Timestamp    uint64
	Burned       uint64
	Issued       uint64
	Tips         uint64
	Transactions uint16
}