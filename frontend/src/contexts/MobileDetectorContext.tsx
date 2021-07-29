import React, { useContext, useState } from 'react';
import { useEffect } from 'react';
import { debounce } from '../utils/debounce';

type MobileDetectorContextType = {
  isMobile?: boolean
}

const MobileDetectorContext = React.createContext<MobileDetectorContextType>({})

const useMobileDetector = () => useContext(MobileDetectorContext);

const isMobileWidth = (): boolean => {
  return window.innerWidth < 760
}

const MobileDetectorProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [isMobile, setIsMobile] = useState<boolean | undefined>(isMobileWidth())

  useEffect(() => {
    const onResize = debounce(() => {
      setIsMobile(isMobileWidth())
      console.log('mobile', isMobileWidth())
    }, 200)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, []);
  
  return (
    <MobileDetectorContext.Provider
      value={{
        isMobile
      }}
    >
      {children}
    </MobileDetectorContext.Provider>
  )
}

export { useMobileDetector, MobileDetectorProvider }