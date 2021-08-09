package sql

type BlockStats struct {
	Number       uint   `json:"number" gorm:"primaryKey;autoIncrement:false"`
	Timestamp    uint64 `json:"timestamp"`
	BaseFee      string `json:"baseFee"`
	Burned       string `json:"burned"`
	GasTarget    string `json:"gasTarget"`
	GasUsed      string `json:"gasUsed"`
	PriorityFee  string `json:"priorityFee"`
	Rewards      string `json:"rewards"`
	Tips         string `json:"tips"`
	Transactions string `json:"transactions"`
}
