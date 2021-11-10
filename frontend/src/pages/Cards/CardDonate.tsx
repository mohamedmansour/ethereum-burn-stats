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
import { LogoIndexed, LogoNansen } from "./Logos";
import { LogoFrontier } from "./Logos/LogoFrontier";
import { LogoHotCross } from "./Logos/LogoHotCross";
import { LogoThales } from "./Logos/LogoThales";

export enum CardDonateType {
  TopSideBar,
  BottomSideBar
}

const Patrons = [
  {
    id: 'indexed',
    logo: LogoIndexed,
    url: "https://indexed.finance",
    description: "indexed.finance: defi investing made easy, crypto indexes and yield aggregators"
  },
  {
    id: 'frontier', // September 10 - 2
    logo: LogoFrontier,
    url: "https://frontier.xyz/",
    description: "Frontier: Native, seamless, cross-chain DeFi aggregation layer"
  },
  {
    id: 'hotcross', // October 5th - 2
    logo: LogoHotCross ,
    url: "https://hotcross.com/",
    description: "Hot Cross is a multi-chain tool suite created for both blockchain teams and their communities."
  },
  {
    id: 'thales', // October 5th - 3
    logo: LogoThales ,
    url: "https://thales.market/",
    description: "Thales: Binary options re-imagined. Permissionless, non-custodial, and fun!"
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
          <ListItem>Through our <Link href="https://gitcoin.co/grants/1709/ethereum-tools-and-educational-grant">Gitcoin Grant</Link></ListItem>
          <ListItem>Monthly sponsorships, in a card like this. Contact us on <Link href="https://twitter.com/mohamedmansour">Twitter</Link></ListItem>
        </UnorderedList>
      </Box>
    </Card>
  );
}
