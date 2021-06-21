import { extendTheme } from "@chakra-ui/react"

const theme = extendTheme({
  colors: {
    brand: {
      header: 'hsl(0deg 0% 0% / 50%)',
      headerText: '#666',
      subheader: '#333',
      subheaderCard: 'rgb(34, 34, 34, 0.6)',
      subheaderCardText: 'white',
      background: '#333',
      settings: 'hsl(212deg 21% 32%)',
      settingsOutline: 'hsl(212deg 21% 39%)',
      card: 'rgb(34, 34, 34, 0.6)',
      primaryText: 'white',
      secondaryText: '#7d7d7d',
      linkColor: 'rgb(0, 108, 190)'
    },
  },
})

export default theme