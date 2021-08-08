import { extendTheme } from "@chakra-ui/react"
import { layoutConfig } from "./layoutConfig"

const theme = extendTheme({
  colors: {
    brand: {
      headerText: '#666',
      subheader: '#333',
      background: '#333',
      settings: 'hsl(212deg 21% 32%)',
      settingsOutline: 'hsl(212deg 21% 39%)',
      card: 'rgb(30, 30, 30)',
      primaryText: 'white',
      secondaryText: '#7d7d7d',
      orange: 'rgb(221, 107, 32)'
    },
  },
  components: {
    Divider: {
      baseStyle: {
        opacity: 0.05,
      }
    },
    Tooltip: {
      baseStyle: {
        bg: 'brand.subheader'
      }
    },
    Link: {
      baseStyle: {
        color: "orange",
      }
    },
    Card: {
      baseStyle: {
        display: "flex",
        flexDirection: "column",
        px: 4,
        py: 3,
        rounded: "md",
        bg: "brand.card",
        shadow: "dark-lg",
        gridGap: layoutConfig.miniGap
      }
    },
    TablePlus: {
      variants: {
        sticky: {
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0, 
          right: 0
        }
      },
      defaultProps: {
        variant: "sticky",
      },
    },
    TdPlus: {
      baseStyle: {
        pt: 3,
        pb: 3,
        pr: 4,
        pl: 4,
      }
    },
    ThPlus: {
      variants: {
        sticky: {
          position: "sticky",
          top: -5,
          bg: "brand.card",
          color: "brand.secondaryText",
          zIndex: 5,
          textAlign: "right",
          paddingTop: 5,
          _notFirst: {
            paddingLeft: 0,
          }
        }
      },
      defaultProps: {
        variant: "sticky",
      },
    }
  }
})

export default theme