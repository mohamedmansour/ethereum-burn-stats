import { EthereumNetwork } from "../../config";
import { WebSocketProvider, WebSocketEventMap } from "./websocket-provider";
import { EthereumApiFormatters } from "./ethereum-api-formatters";
import { AggregatesData, BlockData, EthereumSyncing, InitialData } from "./ethereum-types";

interface EthereumWebSocketEventMap extends WebSocketEventMap {
  "data": BlockData,
  "aggregatesData": AggregatesData
}

/**
 * Core API to communicate to Ethereum node.
 * 
 * Supports:
 *  - LRU cache for client throttling
 *  - Connection Retry for having consistent connection
 *  - Event extension to add custom websocket message events
 */
export class EthereumApi extends WebSocketProvider<EthereumWebSocketEventMap> {
  constructor(public connectedNetwork: EthereumNetwork, url: string, maxReconnectionAttempts: number) {
    super(url, maxReconnectionAttempts, [
      // Disable aggregates socket for now since we need to lazy load this.
      // { event: 'aggregatesData', formatter: (d: any) => EthereumApiFormatters.FormatAggregatesData(d) },
      { event: 'data', formatter: (d: any) => EthereumApiFormatters.FormatBlockData(d) },
    ])
  }

  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return EthereumApiFormatters.FormatSync(await this.send('eth_syncing', []))
  }

  public async getInitialData(blockCount: number): Promise<InitialData> {
    const key = `${this.connectedNetwork.chainId}getInitialData()`
    const result = await this.cachedExecutor<InitialData>(key, () => this.send('internal_getInitialData', [blockCount]))
    return EthereumApiFormatters.FormatInitialData(result);
  }

  public async getInitialAggregatesData(periodCount?: number): Promise<AggregatesData> {
    const key = `${this.connectedNetwork.chainId}getInitialAggregatesData(${periodCount})`
    const result = await this.cachedExecutor<AggregatesData>(key, () => this.send('internal_getInitialAggregatesData', periodCount ? [periodCount]: []), 10000)
    return EthereumApiFormatters.FormatAggregatesData(result)
  }
}
