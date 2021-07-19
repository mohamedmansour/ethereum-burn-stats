import {
  Flex,
  HStack,
  Link,
  Box,
  Heading,
} from "@chakra-ui/react";
import * as CSS from "csstype";
import { Link as ReactLink } from "react-router-dom";
import { FirePit } from "../components/FirePit";
import { Footer } from "../components/Footer";
import { EthereumNetworkBadge } from "../components/Network";
import { layoutConfig } from "../layoutConfig";

interface LayoutProps {
  children: React.ReactNode;
  direction: CSS.Property.FlexDirection;
}

export function Layout(props: LayoutProps) {
  return (
    <Flex direction="column" h="inherit">
      <Flex
        as="nav"
        align={["flex-start", "flex-start", "center"]}
        justify={"space-between"}
        color="white"
        direction={layoutConfig.flexRow}
        pt={layoutConfig.gap}
        pl={layoutConfig.gap}
        pr={layoutConfig.gap}
      >
        <HStack gridGap={8}>
          <Link
            as={ReactLink}
            to="/"
            h="100%"
            whiteSpace="nowrap"
            textDecoration="none"
            cursor="pointer"
          >
            <HStack cursor="pointer">
              <FirePit sparkCount={12} size="24px" />
              <Heading size="lg">Watch The <Box display="inline" color="brand.orange">Burn</Box></Heading>
            </HStack>
          </Link>
        </HStack>
        <EthereumNetworkBadge marginLeft="auto" />
      </Flex>
      <Flex
        flex={1}
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
