package hub

import (
	"encoding/json"
	"net/http"
	"strconv"
	"sync"
	"time"
)

type CoinbaseSpotResponse struct {
	Data struct {
		Base   string  `json:"base"`
		Amount string `json:"amount"`
		Currency string `json:"currency"`
	}
}

type USDPriceWatcher struct {
	price float64
	priceMutex sync.RWMutex
}

func (u *USDPriceWatcher) StartWatching() {
	client := &http.Client{Timeout: 10 * time.Second}
	u.refreshCoinbasePrice(client)

	c := time.Tick(1 * time.Minute)
	for now := range c {
		_ = now
		u.refreshCoinbasePrice(client)
	}
}

func (u *USDPriceWatcher) GetPrice() float64 {
	u.priceMutex.RLock()
	defer u.priceMutex.RUnlock()
	return u.price
}

func (u *USDPriceWatcher) refreshCoinbasePrice(client *http.Client) error {
	r, err := client.Get("https://api.coinbase.com/v2/prices/ETH-USD/spot")
    if err != nil {
		log.Errorln("Error getting coinbase price:", err)
        return err
    }
    defer r.Body.Close()

    response := CoinbaseSpotResponse{}
	err = json.NewDecoder(r.Body).Decode(&response)
    if err != nil {
		log.Errorln("Error decoding coinbase response:", err)
        return err
    }
	
	u.priceMutex.Lock()
	u.price, err = strconv.ParseFloat(response.Data.Amount, 64)
	u.priceMutex.Unlock()
	
	if err != nil {
		log.Errorln("Error parsing coinbase price:", err)
		return err
	}

	return nil
}
