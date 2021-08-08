import React, { createContext, useContext, useEffect, useState } from 'react';
import { defaultNetwork } from '../config';
import { getNetworkFromSubdomain } from '../utils/subdomain';
import { Loader } from '../organisms/Loader';
import { EthereumApi, EthereumSyncing } from '../libs/ethereum';

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
  maxReconnectionAttempts,
}: {
  children: React.ReactNode
  url: string | undefined,
  maxReconnectionAttempts: number
}) => {
  const [eth, setEth] = useState<EthereumApi | undefined>()
  const [message, setMessage] = useState<string>('connecting to eth node')
  useEffect(() => {
    if (!url)
      return;

    const network = getNetworkFromSubdomain() || defaultNetwork
    const ethereum = new EthereumApi(network, url, maxReconnectionAttempts)
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
    
      ethereum.off('retrySuccess', onRetryCheckStatus)
      ethereum.off('retryMaxAttemptsReached', onRetryMaxAttemptsReached)
      setEth(ethereum)
      return true
    }

    const onRetryCheckStatus = async () => {
      checkStatus()
    }

    const onRetryMaxAttemptsReached = async (attempts: number) => {
      setMessage(`Tried to connect to mainnet ${attempts} times. Please refresh and try again.`)
      ethereum.disconnect()
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

    ethereum.on('retrySuccess', onRetryCheckStatus)
    ethereum.on('retryMaxAttemptsReached', onRetryMaxAttemptsReached)

    return () => { 
      clearInterval(timer);
      ethereum.disconnect();
    }
  }, [url, maxReconnectionAttempts])

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
