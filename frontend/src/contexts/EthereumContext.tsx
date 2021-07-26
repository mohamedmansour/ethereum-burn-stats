import React, { createContext, useContext, useEffect, useState } from 'react';
import LRU from 'lru-cache';
import { ethers } from "ethers";
import { BlockWithTransactions } from "@ethersproject/abstract-provider"
import { Ethereumish } from '../react-app-env';
import { defaultNetwork, EthereumNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';
import { Loader } from '../organisms/Loader';

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

export class EthereumApi extends ethers.providers.WebSocketProvider {
  private cache = new LRU({
    max: 10000,
    maxAge: 1000 * 60 * 60  // 1 hour
  });

  constructor(public connectedNetwork: EthereumNetwork, url: string) {
    super(url)
  }

  public async burned(start?: string, end?: string): Promise<ethers.BigNumberish> {
    const key = `${this.connectedNetwork.chainId}burned(${start},${end})`
    return this.cachedExecutor(key, () => this.send('debug_burned', [start, end]))
  }

  public async getBlockReward(blockNumberInHex: string): Promise<ethers.BigNumberish> {
    const key = `${this.connectedNetwork.chainId}getBlockReward(${blockNumberInHex})`
    return this.cachedExecutor(key, () => this.send('debug_getBlockReward', [blockNumberInHex]))
  }

  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return await this.send('eth_syncing', [])
  }

  public async getBlock(blockNumber: number): Promise<ethers.providers.Block> {
    const key = `${this.connectedNetwork.chainId}_getBlock(${blockNumber})`
    return this.cachedExecutor(key, () => super.getBlock(blockNumber))
  }

  public async getBlockWithTransactions(blockNumber: number): Promise<BlockWithTransactions> {
    const key = `${this.connectedNetwork.chainId}getBlockWithTransactions(${blockNumber})`
    return this.cachedExecutor(key, () => super.getBlockWithTransactions(blockNumber))
  }

  public async getTransaction(hash: string): Promise<ethers.providers.TransactionResponse> {
    const key = `${this.connectedNetwork.chainId}getTransaction(${hash})`
    return this.cachedExecutor(key, () => super.getTransaction(hash))
  }

  public async getGasPrice(): Promise<ethers.BigNumber> {
    const key = `${this.connectedNetwork.chainId}getGasPrice()`
    return this.cachedExecutor(key, () => super.getGasPrice(), 10000 /* throttle user every 10s */)
  }

  private async cachedExecutor<T>(key: string, callback: () => T, maxAge?: number): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key) as T
    }
    const result = await callback()
    this.cache.set(key, result, maxAge)
    return result
  }
} 

type EthereumContextType = {
  eth?: EthereumApi,
  connect(): void
}

const EthereumContext = createContext<EthereumContextType>({
  eth: undefined,
  connect: () => {}
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
    return () => { clearInterval(timer)}
  }, [url])

  const connect = async () => {
    if (!window.ethereum) {
      return
    }
    await window.ethereum.enable()
  }

  return (
    <EthereumContext.Provider
      value={{
        eth,
        connect
      }}
    >
      {eth ? children : <Loader>{message}</Loader>}
    </EthereumContext.Provider>
  )
}

export { useEthereum, EthereumProvider }