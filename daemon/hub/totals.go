package hub

import (
	"sync"
)

// TotalsList defines a mutexed list of latest totals
type TotalsList struct {
	periods []Totals
	mu      sync.Mutex
}

func newTotalsList() *TotalsList {
	return &TotalsList{
		periods: []Totals{},
	}
}

func (tl *TotalsList) getTotals(periodCount int) []Totals {
	tl.mu.Lock()
	defer tl.mu.Unlock()

	if len(tl.periods) > periodCount {
		return tl.periods[0:periodCount]
	}

	return tl.periods
}

func (tl *TotalsList) addPeriod(period Totals) {
	tl.mu.Lock()
	defer tl.mu.Unlock()

	if len(tl.periods) > 0 && tl.periods[0].ID == period.ID {
		//log.Debugf("period %s replaced", period.ID)
		tl.periods = tl.periods[1:]
	}

	sliceEnd := len(tl.periods) + 1
	tl.periods = append([]Totals{period}, tl.periods...)[:sliceEnd]
}
