import { BigNumber, utils } from "ethers";
import { EthereumNetwork } from "../../config";
import { HexToBigNumber } from "../../utils/number";
import { WebSocketProvider, WebSocketEventMap } from "./websocket-provider";
import { EthereumApiFormatters } from "./ethereum-api-formatters";
import { BlockData, BlockStats, BlockWithTransactions, EthereumSyncing, InitialData,  Transaction } from "./ethereum-types";

interface EthereumWebSocketEventMap extends WebSocketEventMap {
  "block": BlockStats
  "client": number
  "data": BlockData
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
      { channel: 'blockStats', event: 'block', formatter: (b: any) => EthereumApiFormatters.FormatBlockStats(b) },
      { channel: 'clientsCount', event: 'client' },
      { channel: 'data', event: 'data', formatter: (d: any) => EthereumApiFormatters.FormatBlockData(d) },
    ])
  }

  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return EthereumApiFormatters.FormatSync(await this.send('eth_syncing', []))
  }

  public async getBlockWithTransactions(blockNumber: number): Promise<BlockWithTransactions> {
    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlockWithTransactions(${blockNumber})`
    const result = await this.cachedExecutor<BlockWithTransactions>(key, () => this.send('eth_getBlockByNumber', [blockNumberInHex, true]))
    return EthereumApiFormatters.FormatBlockWithTransactions(result)
  }

  public async getBalance(address: string): Promise<BigNumber> {
    const key = `${this.connectedNetwork.chainId}getBalance(${address})`
    const result = await this.cachedExecutor(key, () => this.send('eth_getBalance', [address, 'latest']), 10000)
    return HexToBigNumber(result)
  }

  public async getTransaction(hash: string): Promise<Transaction> {
    const key = `${this.connectedNetwork.chainId}getTransaction(${hash})`
    const result = await this.cachedExecutor<Transaction>(key, () => this.send('eth_getTransactionByHash', [hash]))
    return EthereumApiFormatters.FormatTransaction(result);
  }

  public async getBlockStats(blockNumber: number): Promise<BlockStats | undefined> {
    if (blockNumber < 0)
      throw Error(`Invalid block of negative value ${blockNumber}`)

    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlockStats(${blockNumberInHex})`
    const result = await this.cachedExecutor<BlockStats>(key, () => this.send('internal_getBlockStats', [blockNumberInHex]))
    return EthereumApiFormatters.FormatBlockStats(result)
  }

  public async getInitialData(): Promise<InitialData> {
    const key = `${this.connectedNetwork.chainId}getInitialData()`
    const result = await this.cachedExecutor<InitialData>(key, () => this.send('internal_getInitialData', []))
    return EthereumApiFormatters.FormatInitialData(result);
  }
}
