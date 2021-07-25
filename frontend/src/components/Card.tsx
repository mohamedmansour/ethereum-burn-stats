import { Box, forwardRef, HTMLChakraProps, useStyleConfig } from "@chakra-ui/react";
import React from "react";

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
}

export const Card = forwardRef<CardProps, 'div'>((props: CardProps, ref: React.ForwardedRef<any>) => {
  const { variant, children, ...rest } = props
  const styles = useStyleConfig("Card", { variant })

  return (
    <Box __css={styles} ref={ref} {...rest}>
      {children}
    </Box>
  )
})