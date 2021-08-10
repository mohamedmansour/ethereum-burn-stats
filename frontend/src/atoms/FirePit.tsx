import { Box, HTMLChakraProps, useStyleConfig } from '@chakra-ui/react'
import * as CSS from "csstype";
import React from 'react';

export interface FirePitProps extends HTMLChakraProps<"div">  {
  size?: CSS.Property.Width;
  variant?: string
  animate?: boolean
}

function FirePitBase(props: FirePitProps) {
  let {
    size,
    variant,
    animate,
    ...rest
  } = props;
  const styles = useStyleConfig("FirePit", { variant })
  size = size || '40px'

  return (
    <Box className={"firepit" + (animate ? ' firepit-animate' : '')} fontSize={size} __css={styles} {...rest}>
      <Box className="firepit-fire">
        <Box className="firepit-flame" />
        <Box className="firepit-flame" />
        <Box className="firepit-flame" />
        <Box className="firepit-flame" />
      </Box>
    </Box>
  )
}

export const FirePit = React.memo(FirePitBase);
