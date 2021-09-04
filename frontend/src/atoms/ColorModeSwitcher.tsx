import * as React from "react"
import {
  useColorMode,
  useColorModeValue,
  IconButton,
  IconButtonProps,
  Button,
} from "@chakra-ui/react"
import { IoMdMoon, IoMdSunny } from "react-icons/io"
import { Setting } from "../config"

type ColorModeSwitcherProps = Omit<IconButtonProps, "aria-label">

export const ColorModeSwitcher: React.FC<ColorModeSwitcherProps> = (props) => {
  const { toggleColorMode } = useColorMode()
  const text = useColorModeValue("dark", "light")
  const SwitchIcon = useColorModeValue(IoMdMoon, IoMdSunny)

  const onSwitchClick = () => {
    toggleColorMode()
  }

  const label = `Switch to ${text} mode`
  const buttonStyle: any = {
    fontSize:"md",
    variant:"ghost",
    color:"current",
    marginLeft:"2",
    onClick: onSwitchClick,
    "aria-label": label
  }

  if (localStorage[Setting.colorMode])
    return <IconButton icon={<SwitchIcon />} {...buttonStyle} {...props}>{label}</IconButton>
  else
    return <Button rightIcon={<SwitchIcon />} {...buttonStyle} {...props}>{label}</Button>
}
