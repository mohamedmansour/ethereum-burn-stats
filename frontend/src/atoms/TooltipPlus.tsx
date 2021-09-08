import { Box, Icon, LightMode, Tooltip, TooltipProps, useStyleConfig } from "@chakra-ui/react"
import React from "react"
import { MdInfoOutline } from "react-icons/md"

export interface TooltipPlusProps extends Partial<TooltipProps> {
  children?: React.ReactNode
}

export function TooltipPlus(props: TooltipPlusProps) {
  const { variant, label, children, ...rest } = props
  const styles = useStyleConfig("TooltipPlus") as any

  const tooltipLabel = (
    <Box position="relative" fontWeight="normal">
      {label}
    </Box>
  )

  let tooltipChildren = children;
  if (!children) {
    tooltipChildren = <Box position="relative"><Icon as={MdInfoOutline} fontSize={16} /></Box>
  }

  return (
    <Tooltip {...styles} {...rest} label={tooltipLabel}>
      {tooltipChildren}
    </Tooltip>
  )
}
