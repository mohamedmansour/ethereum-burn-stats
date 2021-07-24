import { extendTheme } from "@chakra-ui/react"

const theme = extendTheme({
  colors: {
    brand: {
      headerText: '#666',
      subheader: '#333',
      background: '#333',
      settings: 'hsl(212deg 21% 32%)',
      settingsOutline: 'hsl(212deg 21% 39%)',
      card: 'rgb(40, 40, 40)',
      primaryText: 'white',
      secondaryText: '#7d7d7d',
      orange: 'rgb(221, 107, 32)'
    },
  },
})

export default theme