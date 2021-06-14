import React, { useContext, useEffect, useState } from 'react';
import { TopLevelLoader } from './TopLevelLoader';
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
    const web3 = new Web3('ws://localhost:8546');

    web3.extend({
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

    setWeb3(web3)
  }, [])

  return (
    <Web3Context.Provider
      value={{
        web3
      }}
    >
      {web3 ? children : <TopLevelLoader>connecting to web3 node</TopLevelLoader>}
    </Web3Context.Provider>
  )
}

export { useWeb3, Web3Provider }