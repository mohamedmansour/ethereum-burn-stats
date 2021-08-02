package cmd

import (
	"context"
	"sync"

	"github.com/mohamedmansour/ethereum-burn-stats/daemon/ethereumservice"
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/websocket"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var log = logrus.WithField("prefix", "main")

func newRootCmd() *cobra.Command {
	var gethEndpoint string
	var httpAddress string

	rootCmd := &cobra.Command{
		Use:   "ethereum-burn-stats",
		Short: "short",
		Long:  `long`,
		RunE: func(cmd *cobra.Command, args []string) error {
			return root(gethEndpoint, httpAddress)
		},
	}

	rootCmd.Flags().StringVar(&gethEndpoint, "geth-endpoint", "", "Endpoint to geth, can be rpc or http")
	rootCmd.Flags().StringVar(&httpAddress, "addr", ":8080", "HTTP service address")

	return rootCmd
}

func root(gethEndpoint string, httpAddress string) error {
	var wg sync.WaitGroup

	hub := websocket.NewHub()

	wg.Add(3)

	go func(gethEndpoint string, hub *websocket.Hub, wg *sync.WaitGroup) {
		defer wg.Done()

		service, err := ethereumservice.New(
			context.Background(),
			hub,
			&ethereumservice.ServiceConfig{
				GethEndpoint: gethEndpoint,
			},
		)
		if err != nil {
			log.Error(err)
			return
		}

		service.Start()
	}(gethEndpoint, hub, &wg)

	go func(wg *sync.WaitGroup) {
		defer wg.Done()
		hub.Run()
	}(&wg)

	go func(httpAddress string, hub *websocket.Hub, wg *sync.WaitGroup) {
		defer wg.Done()

		websocket.New(httpAddress, hub)
	}(httpAddress, hub, &wg)

	wg.Wait()

	return nil
}

// Execute runs cli command
func Execute() error {
	return newRootCmd().Execute()
}
