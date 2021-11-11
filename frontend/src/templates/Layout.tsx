import {
  Drawer,
  DrawerBody,
  DrawerCloseButton,
  DrawerContent,
  DrawerOverlay,
  Flex,
  HStack,
  HTMLChakraProps,
  IconButton,
  Link,
  Text,
  useColorModeValue,
  useDisclosure,
} from "@chakra-ui/react";
import { Link as ReactLink, useLocation } from "react-router-dom";
import { layoutConfig } from "../layoutConfig";
import { Announcement } from "../organisms/Announcement";
import { ColorModeSwitcher } from "../atoms/ColorModeSwitcher";
import { LogoWithTextIcon } from "../atoms/LogoWithTextIcon";
import { useMobileDetector } from "../contexts/MobileDetectorContext";
import { CardLatestStats } from "../pages/Cards/CardLatestStats";
import { CardTotals } from "../pages/Cards/CardTotals";
import { useEffect, useRef, useState } from "react";
import { TooltipPlus } from "../atoms/TooltipPlus";
import { VscMenu } from "react-icons/vsc";
import { CardDonate, CardDonateType } from "../pages/Cards/CardDonate";

interface LayoutProps {
  children: React.ReactNode;
}

function NavigationItem({ currentPage, path, label, style, activeColor }: { currentPage: string, path: string, label: string, activeColor: string, style?: HTMLChakraProps<any> }) {
  return (
    <>
      {currentPage === path
        ? (<Text {...style} userSelect="none" cursor="default" color={activeColor}>{label}</Text>)
        : (<Link {...style} _hover={{ textDecoration: "none", color: activeColor }} userSelect="none" as={ReactLink} to={path}>{label}</Link>)
      }
    </>
  )
}

function Navigation({ isMobile }: { isMobile: boolean }) {
  const location = useLocation();
  const [currentPage, setCurrentPage] = useState(location.pathname);
  const color = useColorModeValue("rgba(0, 0, 0, 0.4)", "rgba(255, 255, 255, 0.4)")
  const activeColor = useColorModeValue("#000", "#fff")

  useEffect(() => {
    setCurrentPage(location.pathname)
  }, [location])

  const itemStyle: HTMLChakraProps<any> = isMobile ? {
    width: "100%",
    flexDirection: "column",
    padding: 4,
  } : {};

  const linkStyle: HTMLChakraProps<any> = isMobile ? {
    width: "inherit",
    color
  } : {
    color
  };

  return (
    <Flex {...itemStyle} gridGap={8} fontSize={18} lineHeight="21px" whiteSpace="nowrap">
        <NavigationItem style={linkStyle} currentPage={currentPage} path="/" label="Blocks" activeColor={activeColor} />

        <NavigationItem style={linkStyle} currentPage={currentPage} path="/insights" label="Insights" activeColor={activeColor} />

        <NavigationItem style={linkStyle} currentPage={currentPage} path="/about" label="About" activeColor={activeColor} />

        <Link {...linkStyle} _hover={{ textDecoration: "none", color: activeColor }} userSelect="none" target="_blank" href="https://github.com/mohamedmansour/ethereum-burn-stats">Source code</Link>

        <Link {...linkStyle} _hover={{ textDecoration: "none", color: activeColor }} userSelect="none" target="_blank" href="https://gitcoin.co/grants/1709/ethereum-tools-and-educational-grant">
          <TooltipPlus label="Please help support the server costs, hosting Geth is not cheap 🖤 You can donate through Gitcon Grant, or through website sponsorships." textAlign="center" placement="top">
            <Text>Donate</Text>
          </TooltipPlus>
        </Link>
    </Flex>
  )
}

function Logo() {
  const logoColor = useColorModeValue("black", "white")
  return (
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
  )
}

function Sidebar({ isMobile }: { isMobile: boolean }) {
  return (
    <Flex
      direction="column"
      flexShrink={0}
      gridGap={layoutConfig.gap}
      mb={layoutConfig.gap}
      w={isMobile ? undefined : layoutConfig.sidebarWidth}>
      <CardDonate type={CardDonateType.TopSideBar} />
      <CardTotals />
      <CardLatestStats />
      {!isMobile && <CardDonate type={CardDonateType.BottomSideBar} />}
    </Flex>
  )
}

function MenuPopup({ isMobile }: { isMobile: boolean }) {
  const { isOpen, onOpen, onClose } = useDisclosure()
  const btnRef = useRef(null)

  return (
    <>
      <IconButton
        size="md"
        fontSize="lg"
        variant="ghost"
        color="current"
        marginLeft="2"
        onClick={onOpen}
        icon={<VscMenu />}
        aria-label="Expand the navigation menu"
      />
      <Drawer
        isOpen={isOpen}
        placement="top"
        onClose={onClose}
        finalFocusRef={btnRef}
      >
        <DrawerOverlay />
        <DrawerContent>
          <DrawerCloseButton />
          <DrawerBody onClick={onClose}>
            <ColorModeSwitcher justifySelf="flex-end" />
            <Navigation isMobile={isMobile} />
          </DrawerBody>
        </DrawerContent>
      </Drawer>
    </>
  )
}

function MenuInline({ isMobile }: { isMobile: boolean }) {
  return (
    <>
      <Flex flex={1} ml={layoutConfig.gap}>
        <Navigation isMobile={isMobile} />
      </Flex>
      <ColorModeSwitcher justifySelf="flex-end" />
    </>
  )
}

export function Layout(props: LayoutProps) {
  const { isMobile, showNavigation } = useMobileDetector();

  const location = useLocation();
  const [showSideBar, setShowSideBar] = useState(!isMobile || location.pathname === "/");

  useEffect(() => {
    setShowSideBar(!isMobile || location.pathname === "/")
  }, [isMobile, location])

  return (
    <Flex direction="column" h="inherit" ml={layoutConfig.gap} mr={layoutConfig.gap}>
      <Flex
        as="nav"
        align="center"
        justify={"space-between"}
        direction="row"
      >
        <HStack w={layoutConfig.sidebarWidth}>
          <Logo />
        </HStack>
        {showNavigation ? <MenuPopup isMobile={showNavigation} /> : <MenuInline isMobile={showNavigation} />}
      </Flex>

      <Announcement />

      <Flex flex={1} direction={isMobile ? "column" : "row"} mb={isMobile ? layoutConfig.gap : 0}>
        {showSideBar && <Sidebar isMobile={isMobile} /> }
        <Flex flex={1} direction="column" ml={isMobile ? 0 : layoutConfig.gap} mb={layoutConfig.gap} gridGap={layoutConfig.gap}>
          {props.children}
          {isMobile && showSideBar && <CardDonate type={CardDonateType.BottomSideBar} />}
        </Flex>
      </Flex>
    </Flex>
  );
}
