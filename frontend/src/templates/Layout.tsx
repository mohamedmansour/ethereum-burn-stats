import {
  Flex,
  HStack,
  Link,
  Box,
  Heading,
} from "@chakra-ui/react";
import * as CSS from "csstype";
import { Link as ReactLink } from "react-router-dom";
import { FirePit } from "../atoms/FirePit";
import { Footer } from "../organisms/Footer";
import { EthereumNetworkBadge } from "../organisms/Network";
import { layoutConfig } from "../layoutConfig";
import { Announcement } from "../organisms/Announcement";

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
            _hover={{
              textDecoration: "none",
            }}
          >
            <HStack cursor="pointer">
              <FirePit size="24px" />
              <Heading size="lg" color="white">Watch The <Box display="inline" color="brand.orange">Burn</Box></Heading>
            </HStack>
          </Link>
        </HStack>
        <EthereumNetworkBadge marginLeft="auto" />
      </Flex>
      <Announcement />
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
