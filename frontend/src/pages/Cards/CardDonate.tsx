import {
  Text,
  Link,
  HStack,
  Box,
  ListItem,
  UnorderedList,
  LinkOverlay,
  LinkBox,
  Spacer,
  SimpleGrid,
  useColorModeValue,
} from "@chakra-ui/react";
import { Card } from "../../atoms/Card";
import { LogoFrontier, LogoHotCross, LogoNansen, LogoThales, LogoTracer } from "./Logos";
import { LogoRealityCards } from "./Logos/LogoRealityCards";
import { LogoUnmarshal } from "./Logos/LogoUnmarshal";

export enum CardDonateType {
  TopSideBar,
  BottomSideBar
}

const Patrons = [
  {
    id: 'frontier', // Nov 9 - 6
    logo: LogoFrontier,
    url: "https://frontier.xyz/",
    description: "Frontier: Native, seamless, cross-chain DeFi aggregation layer"
  },
  {
    id: 'hotcross', // Oct 5th - 2
    logo: LogoHotCross ,
    url: "https://hotcross.com/",
    description: "Hot Cross is a multi-chain tool suite created for both blockchain teams and their communities."
  },
  {
    id: 'thales', // October 5th - 3
    logo: LogoThales ,
    url: "https://thalesmarket.io/",
    description: "Thales: Binary options re-imagined. Permissionless, non-custodial, and fun!"
  },
  {
    id: 'tracer', // November 12th - 3
    logo: LogoTracer ,
    url: "https://tracer.finance?utm_campaign=wtb&utm_medium=web",
    description: "Tracer is an open-source, smart contract protocol for derivatives to manage and hedge price risk to any market"
  },
  {
    id: 'realitycards', // November 18th - 3
    logo: LogoRealityCards ,
    url: "https://beta.realitycards.io/",
    description: "The world's only prediction market built around NFTs. Don't bet on an outcome, own it!"
  },
  {
    id: 'unmarshal', // December 22nd - 3
    logo: LogoUnmarshal ,
    url: "https://unmarshal.io/",
    description: "The easiest way to query Blockchain data from Ethereum, Binance Smart Chain and Polygon!"
  }
]

export function CardDonate({ type }: { type: CardDonateType }) {
  const logoColor = useColorModeValue("#001D32", "white")
  
  if (process.env.REACT_APP_SHOW_SERVER_SPONSOR === "true") {
    if (type === CardDonateType.TopSideBar) {
      const title = "nansen.ai: identify opportunities before everyone else. Analyses 90M+ labeled ethereum wallets and their activity.";
      return (
        <Card minH="56px">
          <LinkBox title={title} whiteSpace="nowrap">
            <LinkOverlay href="https://www.nansen.ai" target="_blank" display="flex">
              <HStack flex={1}>
                <Text size="xs" fontWeight="bold" flex={1} variant="brandSecondary">Sponsored By</Text>
                <Spacer />
                <LogoNansen color={logoColor} />
              </HStack>
            </LinkOverlay>
          </LinkBox>
        </Card>
      )
    }

    return (
      <Card title="Patrons" subtitle="Thanks to these patrons who has offered to help support the server costs and development!">
        <Box>
          <SimpleGrid columns={2} gridGap={2} mt={2} alignItems="center" justifyContent="center">
            {Patrons.map(patron => (
              <LinkBox title={patron.description} key={patron.id}>
                <LinkOverlay href={patron.url} target="_blank">
                  <patron.logo color={logoColor} />
                </LinkOverlay>
              </LinkBox>
            ))}
          </SimpleGrid>
          <Text fontSize={12} textAlign="right" mt={2}><Link href="https://twitter.com/mohamedmansour" target="_blank">Become a patron!</Link></Text>
        </Box>
      </Card>
    )
  }

  if (type === CardDonateType.TopSideBar) {
    return null;
  }

  return (
    <Card title="Support WatchTheBurn">
      <Box pl={4} pr={4} pb={4}>
        <Text>It's expensive hosting multiple geth instances on the cloud. Any help would be appreciated:</Text>
        <UnorderedList mt={4}>
          <ListItem>Through our <Link href="https://gitcoin.co/grants/1709/watchtheburncom">Gitcoin Grant</Link></ListItem>
          <ListItem>Monthly sponsorships, in a card like this. Contact us on <Link href="https://twitter.com/mohamedmansour">Twitter</Link></ListItem>
        </UnorderedList>
      </Box>
    </Card>
  );
}
