import { Flex, HStack, Text, Image, Badge, Link } from "@chakra-ui/react";
import * as CSS from "csstype";
import { Settings } from "./Settings";

interface LayoutProps {
  children: React.ReactNode
  direction: CSS.Property.FlexDirection
  totalBurned: string | undefined
}

export function Layout(props: LayoutProps) {
  const { totalBurned } = props
  return (
    <Flex direction="column" overflow="hidden" height="inherit">
      <HStack
        as="nav"
        align="center"
        justify="space-between"
        padding="0.5rem"
        bg="gray.300"
        color="white"
        boxShadow="md"
      >
        <HStack cursor="pointer" align="center">
          <Image src="favicon.png" />
          <Text color="black">ETH Burn</Text>
        </HStack>
        <HStack>
          <Text fontSize="md" fontWeight="bold" color="black">
            {totalBurned && (<Badge ml="1" colorScheme="gray">Total Burned: {totalBurned} ETH</Badge>)} 
          </Text>
          <Settings />
        </HStack>
      </HStack>
      <Flex flex={1} overflowY="auto" w="100%" flexDir={props.direction}>
        {props.children}
      </Flex>
      <HStack alignItems="center" justifyContent="center">
        <Link color="teal.500" href="https://twitter.com/mohamedmansour">
          Twitter
        </Link>
        <Link color="teal.500" href="https://github.com/mohamedmansour/eth-burn">
          GitHub
        </Link>
        <Link color="teal.500" href="https://github.com/mohamedmansour/eth-burn/blob/main/README.md">
          Donate for Server Costs
        </Link>
      </HStack>
    </Flex>
  )
}