import React, { createContext, useContext, useEffect, useState } from 'react';
import LRU from 'lru-cache';
import { ethers, utils } from "ethers";
import { BlockWithTransactions } from "@ethersproject/abstract-provider"
import { Ethereumish } from '../react-app-env';
import { defaultNetwork, EthereumNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';
import { Loader } from '../organisms/Loader';
import { EventEmitter } from '../utils/event';
import { BigNumberNormalize } from '../utils/bignumber';

declare global {
  interface Window {
    ethereum: Ethereumish
  }
}

interface EthereumSyncing {
  currentBlock: ethers.BigNumberish
  highestBlock: ethers.BigNumberish
  startingBlock: ethers.BigNumberish
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
        this.send("eth_subscribe", ["newHeads"]).then(() => resolve()).catch(e => reject(e))
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

  public on(eventName: 'block', callback: (block: any) => void) {
    this.eventEmitter.on(eventName, callback);
  }

  public off(eventName: 'block', callback: (block: any) => void) {
    this.eventEmitter.off(eventName, callback);
  }

  public onMessage(evt: MessageEvent) {
    const eventData = JSON.parse(evt.data) as AsyncMessage<{}>
    if (eventData.id) {
      const [resolve, ] = this.promiseMap[eventData.id]
      resolve(eventData.result !== undefined ? eventData.result : eventData.params?.result)
      delete this.promiseMap[eventData.id]
    } else if (eventData.method === 'eth_subscription') {
      this.eventEmitter.emit('block', eventData.params?.result)
    }
  }
}

export class EthereumApi extends WebSocketProvider {
  constructor(public connectedNetwork: EthereumNetwork, url: string) {
    super(url)
  }

  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return this.send('eth_syncing', [])
  }
  
  public async burned(start: string, end?: string): Promise<ethers.BigNumberish> {
    const key = `${this.connectedNetwork.chainId}burned(${start},${end})`
    return this.cachedExecutor(key, () => this.send('debug_burned', [start, end || '']))
  }

  public async getBlockReward(blockNumberInHex: string): Promise<ethers.BigNumberish> {
    const key = `${this.connectedNetwork.chainId}getBlockReward(${blockNumberInHex})`
    return this.cachedExecutor(key, () => this.send('debug_getBlockReward', [blockNumberInHex]))
  }
  
  public async getBlockNumber(): Promise<number> {
    const key = `${this.connectedNetwork.chainId}getBlockNumber()`
    return this.cachedExecutor(key, () => this.send('eth_blockNumber', []), 10000)
  }
  
  public async getBlock(blockNumber: number): Promise<ethers.providers.Block> {
    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlock(${blockNumberInHex})`
    return this.cachedExecutor(key, () => this.send('eth_getBlockByNumber', [blockNumberInHex, false]))
  }

  public async getBlockWithTransactions(blockNumber: number): Promise<BlockWithTransactions> {
    const blockNumberInHex = utils.hexValue(blockNumber)
    const key = `${this.connectedNetwork.chainId}getBlock(${blockNumber})`
    const result = await this.cachedExecutor<BlockWithTransactions>(key, () => this.send('eth_getBlockByNumber', [blockNumberInHex, true]))
    result.transactions = result.transactions.map(t => {
      t.gasLimit = BigNumberNormalize(t.gasLimit);
      t.value = BigNumberNormalize(t.value);
      t.gasPrice = BigNumberNormalize(t.gasPrice);
      t.maxPriorityFeePerGas = BigNumberNormalize(t.maxPriorityFeePerGas);
      t.maxFeePerGas = BigNumberNormalize(t.maxFeePerGas);
      return t;
    });
    result.gasLimit = BigNumberNormalize(result.gasLimit);
    result.gasUsed = BigNumberNormalize(result.gasUsed);
    return result
  }

  public async getBalance(address: string): Promise<ethers.BigNumber> {
    const key = `${this.connectedNetwork.chainId}getBalance(${address})`
    const result = await this.cachedExecutor(key, () => this.send('eth_getBalance', [address, 'latest']), 10000)
    return BigNumberNormalize(result)
  }

  public async getTransaction(hash: string): Promise<ethers.providers.TransactionResponse> {
    const key = `${this.connectedNetwork.chainId}getTransaction(${hash})`
    const result = await this.cachedExecutor<ethers.providers.TransactionResponse>(key, () => this.send('eth_getTransactionByHash', [hash]))
    result.gasLimit = BigNumberNormalize(result.gasLimit);
    result.value = BigNumberNormalize(result.value);
    result.gasPrice = BigNumberNormalize(result.gasPrice);
    result.maxPriorityFeePerGas = BigNumberNormalize(result.maxPriorityFeePerGas);
    result.maxFeePerGas = BigNumberNormalize(result.maxFeePerGas);
    return result
  }

  public async getGasPrice(): Promise<ethers.BigNumber> {
    const key = `${this.connectedNetwork.chainId}getGasPrice()`
    return this.cachedExecutor(key, () => this.send('eth_gasPrice', []), 10000 /* throttle user every 10s */)
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
      const syncStatus = await ethereum.isSyncing()
      if (syncStatus !==  false) {
        const currentBlock = ethers.BigNumber.from((syncStatus as EthereumSyncing).currentBlock).toNumber()
        const highestBlock = ethers.BigNumber.from((syncStatus as EthereumSyncing).highestBlock).toNumber()
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