package sql

import (
	"context"
	"math/big"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

// Int64 SQL type that can retrieve NULL value
type BigInt struct {
	*big.Int
}

func (n BigInt) GormDataType() string {
	return "BIGINT"
}

func (n BigInt) GormValue(ctx context.Context, db *gorm.DB) clause.Expr {
	return clause.Expr{
		SQL:  "?",
		Vars: []interface{}{n.String()},
	}
}

func (n *BigInt) Scan(value interface{}) error {
	bigint := new(big.Int)
	bigint.SetBytes(value.([]byte))
	n.Int = bigint
	return nil
}
