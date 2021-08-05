package sql

type BlockDetails struct {
	Block        uint `gorm:"primaryKey;autoIncrement:false"`
	Timestamp    uint64
	Burned       string
	Issued       string
	Tips         string
	Transactions uint
}
