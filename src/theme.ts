import { extendTheme } from "@chakra-ui/react"

const theme = extendTheme({
  colors: {
    brand: {
      header: 'hsl(211deg 21% 39%)',
      subheader: 'hsl(211deg 21% 42%)',
      subheaderCard: 'hsl(212deg 21% 34%)',
      subheaderCardText: '#e6e6e6',
      background: '#EDF2F7',
      settings: 'hsl(212deg 21% 32%)',
      settingsOutline: 'hsl(212deg 21% 39%)',
      card: '#ffffff'
    },
  },
})

export default theme