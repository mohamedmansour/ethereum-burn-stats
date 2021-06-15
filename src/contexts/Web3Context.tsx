import React, { useContext, useEffect, useState } from 'react';
import { Loader } from '../components/Loader';
import Web3 from 'web3';

declare module 'web3' {
  interface Debug {
    burned: (start?: string, end?: string) => Promise<string>
  }

  export default interface Web3 {
    debug: Debug
  }
}

type Web3ContextType = {
  web3?: Web3
}

const Web3Context = React.createContext<Web3ContextType>({
  web3: undefined
})

const useWeb3 = () => useContext(Web3Context);

const Web3Provider = ({
  children,
  url,
}: {
  children: React.ReactNode
  url?: string | undefined
}) => {
  const [web3, setWeb3] = useState<Web3 | undefined>()

  useEffect(() => {
    if (!url)
      return;

    const provider = new Web3(url);

    provider.extend({
      property: 'debug',
      methods: [
        {
          name: 'burned',
          call: 'debug_burned',
          params: 2,
          inputFormatter: [null, null]
        }
      ]
    })

    setWeb3(provider)

    // Used for debugging
    const w = (window as any)
    w.web3 = provider//0x23e38
    
    return () => {}
  }, [url])

  return (
    <Web3Context.Provider
      value={{
        web3
      }}
    >
      {web3 ? children : <Loader>connecting to web3 node</Loader>}
    </Web3Context.Provider>
  )
}

export { useWeb3, Web3Provider }