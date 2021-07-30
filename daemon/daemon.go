package main

import (
	"context"
	"flag"
	"sync"

	"github.com/sirupsen/logrus"
)


var (
	GethEndpoint = flag.String("geth-endpoint", "", "Endpoint to geth, can be rpc or http")
)

var log = logrus.WithField("prefix", "main")

func RunEthereumGateway(wg *sync.WaitGroup) {
	service, err := NewEthereumService(context.Background(), &ServiceConfig{
		GethEndpoint: *GethEndpoint,
	})
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
	flag.Parse()

	var wg sync.WaitGroup
	wg.Add(2)
	go RunEthereumGateway(&wg)
	go RunWebSocketServer(&wg)
	wg.Wait()
}
