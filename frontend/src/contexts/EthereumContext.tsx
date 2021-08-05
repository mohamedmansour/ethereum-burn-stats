import React, { createContext, useContext, useEffect, useState } from 'react';
import LRU from 'lru-cache';
import { BigNumber, utils } from "ethers";
import { Ethereumish } from '../react-app-env';
import { defaultNetwork, EthereumNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';
import { Loader } from '../organisms/Loader';
import { EventEmitter } from '../utils/event';
import { HexToNumber, HexToBigNumber } from '../utils/number';

declare global {
  interface Window {
    ethereum: Ethereumish
  }
}

interface EthereumSyncing {
  currentBlock: number
  highestBlock: number
  startingBlock: number
  knownStates: number
  pulledStates: number
}

enum WebSocketStatus {
  CONNECTING,
  CONNECTED,
  DISCONNECTED,
}

interface AsyncMessage<T> {
  jsonrpc: "2.0"
  id?: number
  method?: string
  params?: {
    result: T,
    subscription: string
  }
  result?: string
}

export interface BlockStats {
  baseFee: BigNumber
  burned: BigNumber
  gasTarget: BigNumber
  gasUsed: BigNumber
  rewards: BigNumber
  tips: BigNumber
  number: number
  timestamp: number
  transactions: number
}

export interface BaseBlock {
  baseFeePerGas: BigNumber
  gasLimit: BigNumber
  gasUsed: BigNumber
  number: number
  size: number
  timestamp: number
  difficulty: number
  totalDifficulty: number
  extraData: string
  hash: string
  logsBloom: string
  miner: string
  mixHash: string
  nonce: string
  parentHash: string
  receiptsRoot: string
  sha3Uncles: string
  stateRoot: string
  transactionsRoot: string
}

export interface Block extends BaseBlock{
  transactions: string[]
}

export interface BlockWithTransactions extends BaseBlock {
  transactions: Transaction[];
}

export interface Transaction {
  blockHash: string
  from: string
  hash: string
  input: string
  r: string
  s: string
  to: string
  value: string
  nonce: number
  blockNumber: number
  transactionIndex: number
  type: number
  v: number
  gas: BigNumber
  gasPrice: BigNumber
  maxPriorityFeePerGas: BigNumber
  maxFeePerGas: BigNumber
  confirmations: number
}

class WebSocketProvider {
  private eventEmitter = EventEmitter<string>()
  private connection: WebSocket;
  private asyncId: number = 0
  private promiseMap: {[key: number]: [ (value: any | PromiseLike<any>) => void, (e: unknown) => void]} = {}
  private cache = new LRU({
    max: 10000,
    maxAge: 1000 * 60 * 60  // 1 hour
  });

  protected status: WebSocketStatus = WebSocketStatus.CONNECTING
  private ethSubcribeMap: {[key: string]: string} = {}  
  public ready: Promise<void>;

  constructor(url: string) {
    this.connection = new WebSocket(url);
    this.ready = this.connect()
  }

  private connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.connection.addEventListener("close", () => {
        this.status = WebSocketStatus.DISCONNECTED;
      });
      this.connection.addEventListener("message", this.onMessage.bind(this));
      this.connection.addEventListener("open", () => {
        this.status = WebSocketStatus.CONNECTED;
        const ensureEventsSubscribed = [
          new Promise<[string, string]>((resolve, reject) => {
            this.send("eth_subscribe", ["blockStats"]).then((data) => {
              resolve(["block", data as string])
            }).catch(e => reject(e))
          }),
          new Promise<[string, string]>((resolve, reject) => {
            this.send("eth_subscribe", ["clientsCount"]).then((data) => {
              resolve(["client", data as string])
            }).catch(e => reject(e))
          })
        ]
        Promise.all(ensureEventsSubscribed).then((results) => {
          results.forEach(([name, id] ) => {
            this.ethSubcribeMap[id] = name
          })
          resolve()
        }).catch(e => reject(e))
      });
      this.connection.addEventListener("error", (e) => reject(e));
    })
  }

  protected async send<T extends {}>(method: string, params: any[]): Promise<T> {
    const id = this.getNextAsyncId();
    return new Promise((resolve, reject) => {
      this.promiseMap[id] = [resolve, reject]
      this.connection.send(JSON.stringify({
        id,
        jsonrpc: "2.0",
        method,
        params
      }))
    })
  }
  
  protected async cachedExecutor<T>(key: string, callback: () => Promise<T>, maxAge?: number): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }
    const result = await callback()
    this.cache.set(key, result, maxAge)
    return result
  }

  private getNextAsyncId(): number {
    return ++this.asyncId;
  }

  public disconnect(): void {
    this.connection.close();
  }

  public on<T>(eventName: 'block' | 'client', callback: (data: T) => void) {
    this.eventEmitter.on(eventName, callback);
  }

  public off<T>(eventName: 'block' | 'client', callback: (data: T) => void) {
    this.eventEmitter.off(eventName, callback);
  }

  public onMessage(evt: MessageEvent) {
    // Sometimes messages come in multiple pairs to detect it.
    if (evt.data.indexOf('\n') !== -1) {
      const numberOfMessages = evt.data.split('\n')
      numberOfMessages.forEach((message: string) => this.processMessage(message))
    } else {
      this.processMessage(evt.data as string);
    }
  }

  private processMessage(message: string): void {
    let eventData: AsyncMessage<{}>
    try {
      eventData = JSON.parse(message) as AsyncMessage<{}>
    }
    catch (e) {
      console.error(`Please report to developer: "${message}"`)
      return
    }

    if (eventData.id) {
      const [resolve, ] = this.promiseMap[eventData.id]
      resolve(eventData.result !== undefined ? eventData.result : eventData.params?.result)
      delete this.promiseMap[eventData.id]
    } else if (eventData.method === 'eth_subscription') {
      if (!eventData.params) {
        console.error('Something went wrong with receiving the message from server');
        return;
      }
      const subscribedEvent = this.ethSubcribeMap[eventData.params.subscription];
      if (subscribedEvent === 'block') {
        this.eventEmitter.emit('block', EthereumApiFormatters.FormatBlockStats(eventData.params.result as BlockStats))
      }
      else if (subscribedEvent === 'client') {
        this.eventEmitter.emit('client', eventData.params.result)
      } 
      else {
        console.error('unknown event', eventData.params)
      }
    }
  }
}

class EthereumApiFormatters {
  static FormatTransaction(t: Transaction): Transaction {
    t.nonce = HexToNumber(t.nonce)
    t.blockNumber = HexToNumber(t.blockNumber)
    t.transactionIndex = HexToNumber(t.transactionIndex)
    t.type = HexToNumber(t.type)
    t.v = HexToNumber(t.v)
    t.gas = HexToBigNumber(t.gas)
    t.gasPrice = HexToBigNumber(t.gasPrice)
    t.maxPriorityFeePerGas = HexToBigNumber(t.maxPriorityFeePerGas)
    t.maxFeePerGas = HexToBigNumber(t.maxFeePerGas)
    t.confirmations = 0
    return t
  }

  static FormatBlock(b: BaseBlock): BaseBlock {
    b.baseFeePerGas = HexToBigNumber(b.baseFeePerGas)
    b.gasLimit = HexToBigNumber(b.gasLimit)
    b.gasUsed = HexToBigNumber(b.gasUsed)
    b.number = HexToNumber(b.number)
    b.size = HexToNumber(b.size)
    b.timestamp = HexToNumber(b.timestamp)
    b.difficulty = HexToNumber(b.difficulty)
    b.totalDifficulty = HexToNumber(b.totalDifficulty)
    return b
  }

  static FormatBlockStats(b: BlockStats): BlockStats {
    b.baseFee = HexToBigNumber(b.baseFee)
    b.burned = HexToBigNumber(b.burned)
    b.gasTarget = HexToBigNumber(b.gasTarget)
    b.gasUsed = HexToBigNumber(b.gasUsed)
    b.rewards = HexToBigNumber(b.rewards)
    b.tips = HexToBigNumber(b.tips)
    b.number = HexToNumber(b.number)
    b.timestamp = HexToNumber(b.timestamp)
    b.transactions = HexToNumber(b.transactions)
    return b
  }

  static FormatBlockWithTransactions(b: BlockWithTransactions): BlockWithTransactions {
    b = EthereumApiFormatters.FormatBlock(b) as BlockWithTransactions
    b.transactions = (b.transactions || []).map(EthereumApiFormatters.FormatTransaction)
    return b
  }

  static FormatSync(s: EthereumSyncing | boolean): EthereumSyncing | boolean {
    if (s !==  false) {
      s = s as EthereumSyncing
      s.currentBlock = HexToNumber(s.currentBlock)
      s.highestBlock = HexToNumber(s.highestBlock)
      s.startingBlock = HexToNumber(s.startingBlock)
      s.knownStates = HexToNumber(s.startingBlock)
      s.pulledStates = HexToNumber(s.startingBlock)
      return s
    }

    return false
  }
}

export class EthereumApi extends WebSocketProvider {
  constructor(public connectedNetwork: EthereumNetwork, url: string) {
    super(url)
  }

  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return EthereumApiFormatters.FormatSync(await this.send('eth_syncing', []))
  }
  
  public async debug_burned(start: string, end?: string): Promise<BigNumber> {
    const key = `${this.connectedNetwork.chainId}burned(${start},${end})`
    const result = await this.cachedExecutor(key, () => this.send('debug_burned', [start, end || '']))
    return HexToBigNumber(result)
  }

  public async burned(start: string, end?: string): Promise<BigNumber> {
    const key = `${this.connectedNetwork.chainId}burned(${start},${end})`
    const result = await this.cachedExecutor(key, () => this.send('internal_getBurned', [start, end || '']))
    return HexToBigNumber(result)
  }

  public async getBlockNumber(): Promise<number> {
    const key = `${this.connectedNetwork.chainId}getBlockNumber()`
    const result = await this.cachedExecutor(key, () => this.send('eth_blockNumber', []), 10000)
    return HexToNumber(result);
  }
  
  public async getBlock(blockNumber: number): Promise<Block> {
    if (blockNumber < 0)
      throw Error(`Invalid block of negative value ${blockNumber}`)

    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlock(${blockNumberInHex})`
    const result = await this.cachedExecutor<Block>(key, () => this.send('eth_getBlockByNumber', [blockNumberInHex, false]))
    return EthereumApiFormatters.FormatBlock(result) as Block
  }

  public async getBlockStats(blockNumber: number): Promise<BlockStats> {
    if (blockNumber < 0)
      throw Error(`Invalid block of negative value ${blockNumber}`)

    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlockStats(${blockNumberInHex})`
    const result = await this.cachedExecutor<BlockStats>(key, () => this.send('internal_getBlockStats', [blockNumberInHex]))
    return EthereumApiFormatters.FormatBlockStats(result)
  }

  public async getBlockWithTransactions(blockNumber: number): Promise<BlockWithTransactions> {
    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlock(${blockNumber})`
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
} 

type EthereumContextType = {
  eth?: EthereumApi,
}

const EthereumContext = createContext<EthereumContextType>({
  eth: undefined,
})

const useEthereum = () => useContext(EthereumContext);

const EthereumProvider = ({
  children,
  url,
}: {
  children: React.ReactNode
  url?: string | undefined
}) => {
  const [eth, setEth] = useState<EthereumApi | undefined>()
  const [message, setMessage] = useState<string>('connecting to eth node')

  useEffect(() => {
    if (!url)
      return;

    const network = getNetworkFromSubdomain() || defaultNetwork
    const ethereum = new EthereumApi(network, url)
    setMessage(`connecting to ${network.key}, please wait`)

    const checkStatus = async () => {
      let syncStatus = await ethereum.isSyncing()
      if (syncStatus !==  false) {
        syncStatus = syncStatus as EthereumSyncing
        const currentBlock = syncStatus.currentBlock
        const highestBlock = syncStatus.highestBlock
        const percentage = Math.floor((currentBlock / highestBlock) * 100)
        if (percentage === 99) {
          setMessage(`${network.name} is not ready, state healing in progress.`)
        } else {
          setMessage(`${network.name} is not ready, node is syncing. ${percentage}% synced.`)
        }
        return false
      }
    
      setEth(ethereum)
      return true
    }

    let timer: number;
    ethereum.ready.then(async () => {
      if (!(await checkStatus())) {
        timer = window.setInterval(async () => {
          const status = await checkStatus()
          if (status) {
            clearInterval(timer)
          }
        }, 12000)
      }
    })
    return () => { 
      clearInterval(timer);
      ethereum.disconnect();
    }
  }, [url])

  return (
    <EthereumContext.Provider
      value={{
        eth,
      }}
    >
      {eth ? children : <Loader>{message}</Loader>}
    </EthereumContext.Provider>
  )
}

export { useEthereum, EthereumProvider }
