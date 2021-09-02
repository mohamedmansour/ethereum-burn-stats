import {
  Flex,
  HStack,
  Link,
  useColorModeValue,
} from "@chakra-ui/react";
import * as CSS from "csstype";
import { Link as ReactLink } from "react-router-dom";
import { Footer } from "../organisms/Footer";
import { layoutConfig } from "../layoutConfig";
import { Announcement } from "../organisms/Announcement";
import { ColorModeSwitcher } from "../atoms/ColorModeSwitcher";
import { LogoWithTextIcon } from "../atoms/LogoWithTextIcon";

interface LayoutProps {
  children: React.ReactNode;
  direction: CSS.Property.FlexDirection;
}

export function Layout(props: LayoutProps) {
  const logoColor = useColorModeValue("black", "white")

  return (
    <Flex direction="column" h="inherit" ml={layoutConfig.margin} mr={layoutConfig.margin}>
      <Flex
        as="nav"
        align={{ base: "flex-start", md: "center" }}
        justify={"space-between"}
        direction="row"
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
            <HStack cursor="pointer" p="23px 0">
              <LogoWithTextIcon fontSize="45px" color={logoColor} />
            </HStack>
          </Link>
        </HStack>
        <ColorModeSwitcher justifySelf="flex-end" />
      </Flex>
      <Announcement />
      <Flex
        flex={1}
        w="100%"
        flexDir={props.direction}
      >
        {props.children}
      </Flex>
      <Footer />
    </Flex>
  );
}
