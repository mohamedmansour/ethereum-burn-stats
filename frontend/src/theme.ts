import { extendTheme } from "@chakra-ui/react"
import { mode } from "@chakra-ui/theme-tools"
import { Dict } from "@chakra-ui/utils"
import { layoutConfig } from "./layoutConfig"

const secondaryColor = (props: Dict<any>) => mode('#a9a9a9', '#A8A8A8')(props)
const backgroundColor = (props: Dict<any>) => mode('white', '#232635')(props)
const borderColor = (props: Dict<any>) => mode('#eeeeee', '#292929')(props)
const popupColor = (props: Dict<any>) => ({
    rounded: "lg",
    p: 4,
    color: "white",
    bg: "#333",
    fontSize: "sm",
    filter: "drop-shadow(0px 8px 24px rgba(0, 0, 0, 0.2))"
})

const theme = extendTheme({
  config: {
    initialColorMode: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
    useSystemColorMode: false,
  },
  colors: {
    brand: {
      orange: 'rgb(221, 107, 32)'
    },
  },
  components: {
    Tabs: {
      parts: ["tab"],
      baseStyle: (props: any) => ({
        tab: {
          color: secondaryColor(props),
        }
      }),
    },
    Divider: {
      baseStyle: (props: any) => ({
        opacity: 0.50,
        borderColor: mode('blackAlpha.500', 'whiteAlpha.500')(props),
      })
    },
    TooltipPlus: {
      baseStyle: popupColor,
    },
    Link: {
      baseStyle: {
        color: "brand.orange",
      },
      variants: {
        alpha: (props: any) => ({
          color: mode('blackAlpha.500', 'whiteAlpha.500')(props),
        })
      }
    },
    Card: {
      baseStyle: (props: any) => ({
        display: "flex",
        flexDirection: "column",
        px: 5,
        py: 4,
        rounded: "base",
        bg: props.isTransparent ? "transparent" : backgroundColor(props),
        boxShadow: props.isTransparent 
          ? undefined
          : mode("rgb(0 0 0 / 7%) 0px 14px 66px, rgb(0 0 0 / 3%) 0px 10px 17px, rgb(0 0 0 / 5%) 0px 4px 7px;",
                 "0px 8px 24px rgba(0, 0, 0, 0.2)")(props),
        gridGap: layoutConfig.miniGap
      }),
      variants: {
        popup: popupColor
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
      baseStyle: (props: any) => ({
        pt: 3,
        pb: 3,
        pr: 4,
        pl: 4,
        borderColor: borderColor(props),
      }),
      variants: {
        brandSecondary: (props: any) => ({
          color: secondaryColor(props),
        })
      }
    },
    ThPlus: {
      baseStyle: (props: any) => ({
        position: "sticky",
        top: 0,
        bg: backgroundColor(props),
        color: secondaryColor(props),
        borderColor: borderColor(props),
        zIndex: 5,
        textAlign: "right",
        paddingTop: 0,
        _notFirst: {
          paddingLeft: 0,
        }
      })
    },
    Box: {
      variants: {
        brandSecondary: (props: any) => ({
          color: secondaryColor(props)
        })
      }
    },
    Text: {
      variants: {
        brandSecondary: (props: any) => ({
          color: secondaryColor(props)
        })
      }
    }
  },
})

export default theme
