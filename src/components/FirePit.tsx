import { Box, forwardRef, HTMLChakraProps } from '@chakra-ui/react'
import * as CSS from "csstype";
import './FirePit.scss'

export interface FirePitProps extends HTMLChakraProps<"div">  {
  sparkCount?: number
  size?: CSS.Property.Width;
}

export const FirePit = forwardRef<FirePitProps, "div">(
    (props: FirePitProps, ref: React.ForwardedRef<any>) => {
  const {
    sparkCount,
    size,
    ...rest
  } = props

  const styles = {
    sparkCount: sparkCount || 0,
    size: size || '40px'
  }

  const sparks = []
  for (let i = 0; i < styles.sparkCount; i++) {
    sparks.push(<Box key={i} className="spark" />)
  }

  return (
    <Box className="firepit" fontSize={styles.size} {...rest}>
      <Box className="fire">
        <Box className="flame" />
        <Box className="flame" />
        <Box className="flame" />
        <Box className="flame" />
        {sparks}
      </Box>
    </Box>
  )
})
