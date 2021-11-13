package hub

import (
	"encoding/json"
	"net/http"
)

type Health struct {
	Status string `json:"status"`
	Blocks int `json:"blocks`
}

func (h *Hub) serveHealth(w http.ResponseWriter, r *http.Request) {
	h.s.statsByBlock.mu.Lock()
	defer h.s.statsByBlock.mu.Unlock()

	health := Health{
		Status: "OK",
		Blocks: len(h.s.statsByBlock.v),
	}

    w.Header().Set("Content-Type", "application/json; charset=UTF-8")
    w.WriteHeader(http.StatusOK)

    if err := json.NewEncoder(w).Encode(health); err != nil {
        panic(err)
    }
}
