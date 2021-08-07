package sql

type BlockStatsPercentiles struct {
	Number       uint   `json:"number" gorm:"primaryKey;autoIncrement:false"`
	Metric       string `json:"metric"`
	Maximum      uint   `json:"maximum"`
	Median       uint   `json:"median"`
	Minimum      uint   `json:"minium"`
	Tenth        uint   `json:"tenth"`
	TwentyFifth  uint   `json:"twenty_fifth"`
	SeventyFifth uint   `json:"seventy_fifth"`
	Ninetieth    uint   `json:"ninetieth"`
	NinetyFifth  uint   `json:"ninety_fifth"`
	NinetyNinth  uint   `json:"ninety_ninth"`
}
