import { Box, Flex } from '@chakra-ui/react'
import * as CSS from "csstype";
import './FirePit.scss'

export interface FirePitProps {
  sparkCount?: number
  size?: CSS.Property.Width;
}

export function FirePit(props: FirePitProps) {
  const sparkCount = props.sparkCount || 0
  const size = props.size || '40px'

  const sparks = []
  for (let i = 0; i < sparkCount; i++) {
    sparks.push(<Box className="spark" />)
  }
  return (
    <Flex position="relative" w="100%" h="100%" justifyContent="center" alignItems="flex-end">
      <Box className="firepit" w={size} h={size} >
        <Box className="fire">
          <Box className="flame" />
          <Box className="flame" />
          <Box className="flame" />
          <Box className="flame" />
          {sparks}
        </Box>
      </Box>
    </Flex>
  )
}