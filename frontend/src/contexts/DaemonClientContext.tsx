import React, { createContext, useContext, useEffect, useState } from 'react';
import LRU from 'lru-cache';
import { ethers } from "ethers";
import { getNetworkFromSubdomain } from '../utils/subdomain';
import { Loader } from '../organisms/Loader';
import { defaultNetwork, EthereumNetwork } from '../config';
import { EventEmitter } from '../utils/event';

interface DaemonClientSyncing {
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
    console.log(this.asyncId);
    const eventData = JSON.parse(evt.data) as AsyncMessage<{}>
    if (eventData.id) {
      const [resolve, _] = this.promiseMap[eventData.id]
      resolve(eventData.result !== undefined ? eventData.result : eventData.params?.result)
      delete this.promiseMap[eventData.id]
    } else if (eventData.method === 'eth_subscription') {
      this.eventEmitter.emit('block', eventData.params?.result)
    }
  }
}

export class DaemonClient extends WebSocketProvider {
  constructor(public connectedNetwork: EthereumNetwork, url: string) {
    super(url)
  }

  public async isSyncing(): Promise<DaemonClientSyncing | boolean> {
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
  
  public async getBlock(blockNumber: string): Promise<ethers.providers.Block> {
    const key = `${this.connectedNetwork.chainId}internal_getBlockDetails(${blockNumber})`
    return this.cachedExecutor(key, () => this.send('internal_getBlockDetails', [blockNumber]))
  }

  public async getTransaction(hash: string): Promise<ethers.providers.TransactionResponse> {
    const key = `${this.connectedNetwork.chainId}getTransaction(${hash})`
    return this.cachedExecutor(key, () => this.send('eth_getTransactionByHash', [hash]))
  }

  public async getGasPrice(): Promise<ethers.BigNumber> {
    const key = `${this.connectedNetwork.chainId}getGasPrice()`
    return this.cachedExecutor(key, () => this.send('eth_gasPrice', []), 10000 /* throttle user every 10s */)
  }
} 

type DaemonClientContextType = {
  eth?: DaemonClient,
}

const DaemonClientContext = createContext<DaemonClientContextType>({
  eth: undefined,
})

const useDaemonClient = () => useContext(DaemonClientContext);

const DaemonClientProvider = ({
  children,
  url,
}: {
  children: React.ReactNode
  url?: string | undefined
}) => {
  const [eth, setEth] = useState<DaemonClient | undefined>()
  const [message, setMessage] = useState<string>('connecting to eth node')

  useEffect(() => {
    if (!url)
      return;

    const network = getNetworkFromSubdomain() || defaultNetwork
    const api = new DaemonClient(network, url)
    setMessage(`connecting to ${network.key}, please wait`)

    const checkStatus = async () => {
      const syncStatus = await api.isSyncing()
      if (syncStatus !==  false) {
        const currentBlock = ethers.BigNumber.from((syncStatus as DaemonClientSyncing).currentBlock).toNumber()
        const highestBlock = ethers.BigNumber.from((syncStatus as DaemonClientSyncing).highestBlock).toNumber()
        const percentage = Math.floor((currentBlock / highestBlock) * 100)
        if (percentage === 99) {
          setMessage(`${network.name} is not ready, state healing in progress.`)
        } else {
          setMessage(`${network.name} is not ready, node is syncing. ${percentage}% synced.`)
        }
        return false
      }

      setEth(api)
      return true
    }

    let timer: number;
    api.ready.then(async () => {
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
      api.disconnect();
    }
  }, [url])


  return (
    <DaemonClientContext.Provider
      value={{
        eth,
      }}
    >
      {eth ? children : <Loader>{message}</Loader>}
    </DaemonClientContext.Provider>
  )
}

export { useDaemonClient, DaemonClientProvider }