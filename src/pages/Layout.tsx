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
import { Link as ReactLink, useLocation } from "react-router-dom";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { useBlockExplorer } from "../contexts/BlockExplorerContext";
import { Footer } from "../components/Footer";
import { EthereumNetworkBadge } from "../components/Network";
import { BigNumberText } from "../components/BigNumberFormat";

interface LayoutProps {
  children: React.ReactNode;
  direction: CSS.Property.FlexDirection;
}

function DetailSection() {
  const { details } = useBlockExplorer();

  if (!details) return null;

  return (
    <Box bg="brand.subheader" 
        mt="2"
        mr={["0", "0", "8"]}>
      <Flex
        h="100%"
        flex="1"
        justify="flex-start"
        whiteSpace="nowrap"
        gridGap={[4, 4, 4]}
        pl={[2, 3, 8]}
        pr={[2, 4, 8]}
        pt={[2, 3, 4]}
        pb={[2, 3, 4]}
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
          <BigNumberText number={details.totalBurned} />
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
          <BigNumberText number={details.gasPrice} />
        </Card>
      </Flex>
    </Box>
  );
}

export function Layout(props: LayoutProps) {
  const location = useLocation()
  
  return (
    <Flex direction="column" overflow="hidden" height="inherit">
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        color="white"
        direction="row"
        pt={["4", "4", "8"]}
        pl={["4", "4", "8"]}
        pr={["4", "4", "8"]}
      >
        <Flex>
          <Flex>
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
            <EthereumNetworkBadge ml="4"/>
          </Flex>
        </Flex>
        <Link as={ReactLink} to="/settings">
          <Icon as={VscSettingsGear} />
        </Link>
      </Flex>
      { location.pathname !== '/' && <DetailSection /> }
      <Flex
        flex={1}
        overflowY="auto"
        w="100%"
        flexDir={props.direction}
        bg="brand.background"
      >
        {props.children}
      </Flex>
      <Footer />
    </Flex>
  );
}
