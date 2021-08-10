import { Box, HTMLChakraProps, useStyleConfig } from '@chakra-ui/react'
import * as CSS from "csstype";
import React from 'react';
import './FirePit.scss'

export interface FirePitProps extends HTMLChakraProps<"div">  {
  size?: CSS.Property.Width;
  variant?: string
}

function FirePitBase(props: FirePitProps) {
  console.log("FirePit")
  let {
    size,
    variant,
    ...rest
  } = props;
  const styles = useStyleConfig("FirePit", { variant })

  size = size || '40px'

  return (
    <Box className="firepit" fontSize={size} __css={styles} {...rest}>
      <Box className="fire">
        <Box className="flame" />
        <Box className="flame" />
        <Box className="flame" />
        <Box className="flame" />
      </Box>
    </Box>
  )
}

export const FirePit = React.memo(FirePitBase);
