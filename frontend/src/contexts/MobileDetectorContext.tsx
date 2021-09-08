import React, { useContext, useState } from 'react';
import { useEffect } from 'react';
import { debounce } from '../utils/debounce';

type MobileDetectorContextType = {
  isMobile: boolean
  isPortrait: boolean
}

const MobileDetectorContext = React.createContext<MobileDetectorContextType>({
  isMobile: false,
  isPortrait: false
})

const useMobileDetector = () => useContext(MobileDetectorContext);

export const isMobileWidth = (): boolean => {
  return window.innerWidth < 600
}

const isPortraitWidth = (): boolean => {
  return window.innerWidth < 1024
}

const MobileDetectorProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [layout, setLayout] = useState<MobileDetectorContextType>({
    isMobile: isMobileWidth(),
    isPortrait: isPortraitWidth()
  })

  useEffect(() => {
    const onResize = debounce(() => {
      setLayout({
        isMobile: isMobileWidth(),
        isPortrait: isPortraitWidth()
      })
    }, 200)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, []);
  
  return (
    <MobileDetectorContext.Provider value={layout}>
      {children}
    </MobileDetectorContext.Provider>
  )
}

export { useMobileDetector, MobileDetectorProvider }
