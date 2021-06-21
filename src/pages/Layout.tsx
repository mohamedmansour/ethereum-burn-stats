import {
  Flex,
  HStack,
  Text,
  Link,
  Box,
  Icon,
  Heading,
} from "@chakra-ui/react";
import * as CSS from "csstype";
import {
  VscSettingsGear,
} from "react-icons/vsc";
import { Link as ReactLink } from "react-router-dom";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { Footer } from "../components/Footer";
import { EthereumNetwork } from "../components/Network";

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
        p={8}
        pb={2}
        direction={["column", "column", "row"]}
      >
        <Card
          direction="row"
          gridGap={4}
          p={2}
          bg="brand.subheaderCard"
          color="brand.primaryText"
        >
          <Text fontSize="md" fontWeight="bold" color="brand.secondaryText" isTruncated>
            Total Burned
          </Text>
          <Text variant="solid">
            {details.totalBurned} ETH
          </Text>
        </Card>
        <Card
          direction="row"
          gridGap={4}
          p={2}
          bg="brand.subheaderCard"
          color="brand.primaryText"
        >
          <Text fontSize="md" fontWeight="bold" color="brand.secondaryText">
            Block
          </Text>
          <Text variant="solid">
            {details.currentBlock + 1}
          </Text>
          <Text fontSize="md" fontWeight="bold" color="brand.secondaryText">
            Gas Price
          </Text>
          <Text variant="solid">
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
        direction="row"
      >
        <Flex p="1">
          <Flex p="1">
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
                <Heading size="sm">Watch The <Box display="inline" color="brand.orange">Burn</Box></Heading>
              </HStack>
            </Link>
            <EthereumNetwork ml="4"/>
          </Flex>
        </Flex>
        <Link as={ReactLink} to="/settings">
          <Icon as={VscSettingsGear} />
        </Link>
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
      <Footer />
    </Flex>
  );
}
