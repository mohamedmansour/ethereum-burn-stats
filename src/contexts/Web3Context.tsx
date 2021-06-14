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

    const web3 = new Web3(url);

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