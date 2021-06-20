import React, { createContext, useContext, useEffect, useState } from 'react';
import { Loader } from '../components/Loader';
import { ethers } from "ethers";
import { Ethereumish } from '../react-app-env';

declare global {
  interface Window {
    ethereum: Ethereumish
  }
}

export class EthereumApi extends ethers.providers.WebSocketProvider {
  public burned(start?: string, end?: string): Promise<string> {
    return this.send('debug_burned', [start, end])
  }
  public getBlockReward(blockNumberInHex: string): Promise<string> {
    return this.send('debug_getBlockReward', [blockNumberInHex])
  }
  public async getBaseFeePerGas(blockNumberInHex: string): Promise<string> {
    return (await this.send('eth_getHeaderByNumber', [blockNumberInHex])).baseFeePerGas
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
  useEffect(() => {
    if (!url)
      return;

    setEth(new EthereumApi(url))

    return () => {}
  }, [url])

  const connect = async () => {
    if (!window.ethereum)
      return
    await window.ethereum.enable()
  }

  return (
    <EthereumContext.Provider
      value={{
        eth,
        connect
      }}
    >
      {eth ? children : <Loader>connecting to eth node</Loader>}
    </EthereumContext.Provider>
  )
}

export { useEthereum, EthereumProvider }