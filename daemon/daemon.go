package main

import (
	"context"
	"flag"
	"net/http"
	"sync"

	"github.com/sirupsen/logrus"
)


var (
	GethEndpoint = flag.String("geth-endpoint", "", "Endpoint to geth, can be rpc or http")
	HttpAddress = flag.String("addr", ":8080", "HTTP service address")
)

var log = logrus.WithField("prefix", "main")

func RunEthereumGateway(wg *sync.WaitGroup, hub *Hub) {
	service, err := NewEthereumService(context.Background(), hub, &ServiceConfig{
		GethEndpoint: *GethEndpoint,
	})
	if err != nil {
		log.Errorln("Cannot initialize Service")
	} else {
		service.Start()
	}
	wg.Done()
}

func RunWebSocketServer(wg *sync.WaitGroup, hub *Hub) {
	http.HandleFunc("/", ServeHome)
	http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		ServeWebSocket(hub, w, r)
	})
	err := http.ListenAndServe(*HttpAddress, nil)
	if err != nil {
		log.Fatal("ListenAndServe: ", err)
	}
	wg.Done()
}
	

func ServeHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.URL.Path != "/" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if r.Method != "GET" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.ServeFile(w, r, "api.html")
}

func main() {
	flag.Parse()

	hub := NewHub()

	var wg sync.WaitGroup
	wg.Add(3)
	go hub.Run()
	go RunEthereumGateway(&wg, hub)
	go RunWebSocketServer(&wg, hub)
	wg.Wait()
}
