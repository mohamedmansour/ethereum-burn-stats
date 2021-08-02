package cmd

import (
	"fmt"

	"github.com/mohamedmansour/ethereum-burn-stats/daemon/hub"
	"github.com/spf13/cobra"
)

func newRootCmd() *cobra.Command {
	var addr string
	var development bool
	var gethEndpointHTTP string
	var gethEndpointWebsocket string

	rootCmd := &cobra.Command{
		// TODO:
		Use: "ethereum-burn-stats",
		// TODO:
		Short: "short",
		Long:  `long`,
		RunE: func(cmd *cobra.Command, args []string) error {
			if gethEndpointHTTP == "" {
				cmd.Help()
				return fmt.Errorf("--geth-endpoint-http is required")
			}

			if gethEndpointWebsocket == "" {
				cmd.Help()
				return fmt.Errorf("--geth-endpoint-websocket is required")
			}

			return root(
				addr,
				development,
				gethEndpointHTTP,
				gethEndpointWebsocket,
			)
		},
	}

	rootCmd.Flags().StringVar(&addr, "addr", ":8080", "HTTP service address")
	rootCmd.Flags().BoolVar(&development, "development", false, "enable for development mode")
	rootCmd.Flags().StringVar(&gethEndpointHTTP, "geth-endpoint-http", "", "Endpoint to geth for http")
	rootCmd.Flags().StringVar(&gethEndpointWebsocket, "geth-endpoint-websocket", "", "Endpoint to geth for websocket")

	return rootCmd
}

func root(
	addr string,
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
) error {
	hub, err := hub.New(
		development,
		gethEndpointHTTP,
		gethEndpointWebsocket,
	)
	if err != nil {
		return err
	}

	err = hub.ListenAndServe(addr)
	if err != nil {
		return err
	}

	return nil
}

// Execute runs cli command
func Execute() error {
	return newRootCmd().Execute()
}
