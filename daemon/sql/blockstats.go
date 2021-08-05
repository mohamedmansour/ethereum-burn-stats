package sql

type BlockStats struct {
	Number       uint `gorm:"primaryKey;autoIncrement:false"`
	Timestamp    uint64
	BaseFee      string
	Burned       string
	GasTarget    string
	GasUsed      string
	Rewards      string
	Tips         string
	Transactions string
}
