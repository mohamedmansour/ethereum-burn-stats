import { Flex, HStack, Text, Image, Badge, Link, Spacer, LinkBox } from "@chakra-ui/react";
import * as CSS from "csstype";
import { VscGithub, VscHeart, VscTwitter } from "react-icons/vsc";
import { Link as ReactLink } from 'react-router-dom';
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
        <LinkBox as={ReactLink} to="/">
          <HStack cursor="pointer" align="center">
            <Image src="/favicon.png" />
            <Text color="black">ETH Burn</Text>
            <Badge>EIP-1559</Badge>
          </HStack>
        </LinkBox>
        <HStack>
          <Text fontSize="md" fontWeight="bold" color="black">
            {totalBurned && (<Badge ml="1" colorScheme="red">Total Burned: {totalBurned} ETH</Badge>)}
          </Text>
          <Settings />
        </HStack>
      </HStack>
      <Flex flex={1} overflowY="auto" w="100%" flexDir={props.direction}>
        {props.children}
      </Flex>
      <HStack alignItems="center" justifyContent="center" bg="gray.100" boxShadow="md" p="1">
        <Link color="teal.500" href="https://twitter.com/mohamedmansour">
          <HStack>
            <VscTwitter title="Follow Mohamed Mansour on Twitter" />
            <Text>@mohamedmansour</Text>
          </HStack>
        </Link>
        <Link color="teal.500" href="https://twitter.com/vdWijden">
          <HStack>
            <VscTwitter title="Follow Marius Van Der Wijdenme on Twitter" />
            <Text>@vdWijden</Text>
          </HStack>
        </Link>
        <Link color="teal.500" href="https://github.com/mohamedmansour/eth-burn">
          <HStack>
            <VscGithub title="View source code on GitHub" />
            <Text>Source code on GitHub, contribute!</Text>
          </HStack>
        </Link>
        <Spacer />
        <Link color="teal.500" href="https://github.com/mohamedmansour/eth-burn/blob/main/README.md">
          <HStack>
            <VscHeart />
            <Text>Help support server costs</Text>
          </HStack>
        </Link>
      </HStack>
    </Flex>
  )
}