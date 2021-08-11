package sql

type BlockStats struct {
	Number       uint   `json:"number" gorm:"primaryKey;autoIncrement:false"`
	Timestamp    uint64 `json:"timestamp"`
	BaseFee      BigInt `json:"baseFee"`
	Burned       BigInt `json:"burned"`
	GasTarget    BigInt `json:"gasTarget"`
	GasUsed      BigInt `json:"gasUsed"`
	PriorityFee  BigInt `json:"priorityFee"`
	Rewards      BigInt `json:"rewards"`
	Tips         BigInt `json:"tips"`
	Transactions BigInt `json:"transactions"`
}
