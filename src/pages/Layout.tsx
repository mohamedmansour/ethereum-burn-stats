import { Flex, HStack, Text, Badge, Link, Spacer, Box } from "@chakra-ui/react";
import * as CSS from "csstype";
import { VscGithub, VscHeart, VscTwitter } from "react-icons/vsc";
import { Link as ReactLink } from "react-router-dom";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { Settings } from "./Settings";

interface LayoutProps {
  children: React.ReactNode;
  direction: CSS.Property.FlexDirection;
}

function DetailSection() {
  const { details } = useBlockExplorer();

  if (!details) return null;

  return (
    <Box bg="brand.subheader">
      <Flex
        h="100%"
        flex="1"
        justify="flex-start"
        whiteSpace="nowrap"
        gridGap={4}
        p={4}
        direction={["column", "column", "row"]}
      >
        <Card
          direction="row"
          gridGap={4}
          p={2}
          bg="brand.subheaderCard"
          color="brand.subheaderCardText"
        >
          <Text fontSize="md" fontWeight="bold">
            Total Fees Burned
          </Text>
          <Text variant="solid" colorScheme="green">
            {details.totalBurned} ETH
          </Text>
        </Card>
        <Card
          direction="row"
          gridGap={4}
          p={2}
          bg="brand.subheaderCard"
          color="brand.subheaderCardText"
        >
          <Text fontSize="md" fontWeight="bold">
            Block
          </Text>
          <Text variant="solid" colorScheme="green">
            {details.currentBlock + 1}
          </Text>
          <Text fontSize="md" fontWeight="bold">
            Gas Price
          </Text>
          <Text variant="solid" colorScheme="green">
            {details.gasPrice} GWEI
          </Text>
        </Card>
      </Flex>
    </Box>
  );
}

export function Layout(props: LayoutProps) {
  return (
    <Flex direction="column" overflow="hidden" height="inherit">
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        padding="0.5rem"
        bg="brand.header"
        color="white"
        shadow="lg"
        direction={["column", "row", "row"]}
      >
        <Flex p="1">
          <HStack p="1">
            <Link
              as={ReactLink}
              to="/"
              h="100%"
              whiteSpace="nowrap"
              textDecoration="none"
              cursor="pointer" 
            >
               <HStack cursor="pointer">
                <FirePit sparkCount={12} size="20px" />
                <Text color="white">ETH Burn</Text>
              </HStack>
            </Link>
            <Badge bg="brand.subheader" color="white">
              EIP-1559
            </Badge>
          </HStack>
        </Flex>
        <Box display={["none", "block", "block"]}>
          <Settings />
        </Box>
      </Flex>
      <DetailSection />
      <Flex
        flex={1}
        overflowY="auto"
        w="100%"
        flexDir={props.direction}
        bg="brand.background"
        pt="4"
      >
        {props.children}
      </Flex>
      <Flex
        alignItems="center"
        justifyContent="center"
        bg="gray.100"
        boxShadow="md"
        p="2"
        gridGap={[0, 0, 8]}
        whiteSpace="nowrap"
        direction={["column", "column", "row"]}
      >
        <HStack gridGap="8">
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
        </HStack>
        <Link
          color="teal.500"
          href="https://github.com/mohamedmansour/eth-burn"
        >
          <HStack>
            <VscGithub title="View source code on GitHub" />
            <Text>Source code on GitHub, contribute!</Text>
          </HStack>
        </Link>
        <Spacer />
        <Link
          color="teal.500"
          href="https://github.com/mohamedmansour/eth-burn/blob/main/README.md"
        >
          <HStack>
            <VscHeart />
            <Text>Help support server costs</Text>
          </HStack>
        </Link>
      </Flex>
    </Flex>
  );
}
