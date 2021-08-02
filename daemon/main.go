package main

import (
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/cmd"
)

func main() {
	err := cmd.Execute()
	if err != nil {
		panic(err)
	}
}
