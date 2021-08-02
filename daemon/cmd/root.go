package cmd

import (
	"context"
	"fmt"

	"github.com/mohamedmansour/ethereum-burn-stats/daemon/websocket"
	"github.com/sirupsen/logrus"
	"github.com/spf13/cobra"
)

var log = logrus.WithField("prefix", "main")

func newRootCmd() *cobra.Command {
	var gethEndpoint string
	var addr string

	rootCmd := &cobra.Command{
		Use:   "ethereum-burn-stats",
		Short: "short",
		Long:  `long`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if gethEndpoint == "" {
				cmd.Help()
				return fmt.Errorf("--geth-endpoint is required")
			}

			return root(gethEndpoint, addr)
		},
	}

	rootCmd.Flags().StringVar(&gethEndpoint, "geth-endpoint", "", "Endpoint to geth, can be rpc or http")
	rootCmd.Flags().StringVar(&addr, "addr", ":8080", "HTTP service address")

	return rootCmd
}

func root(gethEndpoint string, addr string) error {
	// var wg sync.WaitGroup

	ctx := context.Background()

	hub, err := websocket.NewHub(ctx, gethEndpoint)
	if err != nil {
		return err
	}

	err = hub.ListenAndServe(addr)
	if err != nil {
		return err
	}

	// wg.Add(3)

	// go func(gethEndpoint string, hub *websocket.Hub, wg *sync.WaitGroup) {
	// 	defer wg.Done()

	// 	service, err := ethereumservice.New(
	// 		context.Background(),
	// 		hub,
	// 		&ethereumservice.ServiceConfig{
	// 			GethEndpoint: gethEndpoint,
	// 		},
	// 	)
	// 	if err != nil {
	// 		log.Error(err)
	// 		return
	// 	}

	// 	service.Start()
	// }(gethEndpoint, hub, &wg)

	// go func(wg *sync.WaitGroup) {
	// 	defer wg.Done()
	// 	hub.Run()
	// }(&wg)

	// go func(addr string, hub *websocket.Hub, wg *sync.WaitGroup) {
	// 	defer wg.Done()

	// 	websocket.New(addr, hub)
	// }(addr, hub, &wg)

	// wg.Wait()

	return nil
}

// Execute runs cli command
func Execute() error {
	return newRootCmd().Execute()
}
