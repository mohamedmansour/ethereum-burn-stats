import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '../components/Loader';
import { ethers } from "ethers";
import { Ethereumish } from '../react-app-env';
import { defaultNetwork, EthereumNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';

declare global {
  interface Window {
    ethereum: Ethereumish
  }
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
  public async isSyncing(): Promise<boolean> {
    return await this.send('eth_syncing', []) !==  false
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
    const ethereum = new EthereumApi(network, `${url}:${network.port}`)
    setMessage(`connecting to ${network.key}, please wait`)

    ethereum.ready.then(async (details) => {
      if (await ethereum.isSyncing()) {
        setMessage(`${details.name} is not ready, node is syncing`)
      } else {
        setEth(ethereum)
      }
    })
    return () => {}
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