import React, { useContext, useState } from 'react';
import { useEffect } from 'react';
import { debounce } from '../utils/debounce';

type MobileDetectorContextType = {
  isMobile: boolean
  isPortrait: boolean
  showNavigation: boolean
}

const MobileDetectorContext = React.createContext<MobileDetectorContextType>({
  isMobile: false,
  isPortrait: false,
  showNavigation: true
})

const useMobileDetector = () => useContext(MobileDetectorContext);

export const isMobileWidth = (): boolean => {
  return window.outerWidth < 768
}

const isPortraitWidth = (): boolean => {
  return window.outerWidth < 1280
}

const isNavigationWidth = (): boolean => {
  return window.outerWidth < 1048
}

const MobileDetectorProvider = ({
  children
}: {
  children: React.ReactNode
}) => {
  const [layout, setLayout] = useState<MobileDetectorContextType>({
    isMobile: isMobileWidth(),
    isPortrait: isPortraitWidth(),
    showNavigation: isNavigationWidth()
  })

  useEffect(() => {
    const onResize = debounce(() => {
      setLayout({
        isMobile: isMobileWidth(),
        isPortrait: isPortraitWidth(),
        showNavigation: isNavigationWidth()
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
