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
	var connectionString string
	var initializedb bool
	var ropsten bool

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

			if connectionString == "" {
				cmd.Help()
				return fmt.Errorf("--connection-string is required")
			}

			return root(
				addr,
				development,
				gethEndpointHTTP,
				gethEndpointWebsocket,
				connectionString,
				initializedb,
				ropsten,
			)
		},
	}

	rootCmd.Flags().StringVar(&addr, "addr", ":8080", "HTTP service address")
	rootCmd.Flags().BoolVar(&development, "development", true, "enable for development mode")
	rootCmd.Flags().StringVar(&gethEndpointHTTP, "geth-endpoint-http", "http://localhost:8545", "Endpoint to geth for http")
	rootCmd.Flags().StringVar(&gethEndpointWebsocket, "geth-endpoint-websocket", "ws://localhost:8546", "Endpoint to geth for websocket")
	rootCmd.Flags().StringVar(&connectionString, "connection-string", "watchtheburn:watchtheburn@tcp(127.0.0.1:3306)/watchtheburn?charset=utf8mb4&parseTime=True&loc=Local", "Path to the SQLite db or MySQL connection string.")
	rootCmd.Flags().BoolVar(&initializedb, "initializedb", false, "Initialize and Populate DB")
	rootCmd.Flags().BoolVar(&ropsten, "ropsten", false, "Use ropsten block numbers")

	return rootCmd
}

func root(
	addr string,
	development bool,
	gethEndpointHTTP string,
	gethEndpointWebsocket string,
	connectionString string,
	initializedb bool,
	ropsten bool,
) error {
	hub, err := hub.New(
		development,
		gethEndpointHTTP,
		gethEndpointWebsocket,
		connectionString,
		initializedb,
		ropsten,
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
