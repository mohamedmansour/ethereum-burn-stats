import { Box, forwardRef, HStack, HTMLChakraProps, Icon, Text, useStyleConfig } from "@chakra-ui/react";
import React from "react";
import { IconType } from "react-icons"

interface CardProps extends HTMLChakraProps<"div"> {
  variant?: string
  title?: string
  icon?: IconType
}

export const Card = forwardRef<CardProps, 'div'>((props: CardProps, ref: React.ForwardedRef<any>) => {
  const { variant, children, title, icon, ...rest } = props
  const styles = useStyleConfig("Card", { variant })

  return (
    <Box __css={styles} ref={ref} {...rest}>
      {title && (
        <HStack>
          {icon && <Icon as={icon} />}
          <Text fontSize="md" fontWeight="bold">
            {title}
          </Text>
        </HStack>
      )}
      {children}
    </Box>
  )
})