package main

import (
	"context"
	"sync"

	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("prefix", "main")

func RunEthereumGateway(wg *sync.WaitGroup) {
	service, err := NewEthereumService(context.Background())
	if err != nil {
		log.Errorln("Cannot initialize Service")
	} else {
		service.Start()
	}
	wg.Done()
}

func RunWebSocketServer(wg *sync.WaitGroup) {
	NewWebSocketService()
	wg.Done()
}
	

func main() {
	var wg sync.WaitGroup
	wg.Add(2)
	go RunEthereumGateway(&wg)
	go RunWebSocketServer(&wg)
	wg.Wait()
}
