import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '../organisms/Loader';
import { ethers } from "ethers";
import { Ethereumish } from '../react-app-env';
import { defaultNetwork, EthereumNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';

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
  constructor(public connectedNetwork: EthereumNetwork, url: string) {
    super(url)
  }

  public burned(start?: string, end?: string): Promise<ethers.BigNumberish> {
    return this.send('debug_burned', [start, end])
  }
  public getBlockReward(blockNumberInHex: string): Promise<ethers.BigNumberish> {
    return this.send('debug_getBlockReward', [blockNumberInHex])
  }
  public async getBaseFeePerGas(blockNumberInHex: string): Promise<ethers.BigNumberish> {
    return (await this.send('eth_getHeaderByNumber', [blockNumberInHex])).baseFeePerGas
  }
  public async getChainId(): Promise<number> {
    return parseInt((await this.send('eth_chainId', [])))
  }
  public async isSyncing(): Promise<EthereumSyncing | boolean> {
    return await this.send('eth_syncing', [])
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