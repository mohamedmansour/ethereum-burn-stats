package main

import (
	"context"
	"sync"

	"github.com/sirupsen/logrus"
)

var log = logrus.WithField("prefix", "main")

func RunEthereumGateway(wg *sync.WaitGroup) {
	service, err := NewService(context.Background())
	if err != nil {
		log.Errorln("Cannot initialize Service")
	} else {
		service.Start()
	}
	wg.Done()
}

func main() {
	var wg sync.WaitGroup
	wg.Add(1)
	go RunEthereumGateway(&wg)
	wg.Wait()
}
