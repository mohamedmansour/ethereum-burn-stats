package sql

import (
	"context"
	"math/big"

	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type BigInt struct {
	Value *big.Int
}

func (b BigInt) GormDataType() string {
	return "BIGINT"
}

func (b BigInt) GormValue(ctx context.Context, db *gorm.DB) clause.Expr {
	return clause.Expr{
		SQL:  "?",
		Vars: []interface{}{b.Value.String()},
	}
}
