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
import { LogoGoodGhosting, LogoIndexed, LogoNansen, LogoUnicornCircle } from "./Logos";

export enum CardDonateType {
  TopSideBar,
  BottomSideBar
}

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

    const indexedTitle = "indexed.finance: defi investing made easy, crypto indexes and yield aggregators"
    const unicornCircleTitle = "The one and only Unicorn Circle 🦄⭕️ | Always on the hunt for new Business Unicorns!"
    const goodghostingTitle = "The new addictive way to save. Our savings pools reward regular savers with higher interest rates. Start building the financial habits you deserve."
    
    return (
      <Card 
          title="Patrons">
        <Box>
          <SimpleGrid columns={2} gridGap={2} mt={2} alignItems="center" justifyContent="center">
            <LinkBox title={indexedTitle}>
              <LinkOverlay href="https://indexed.finance" target="_blank">
                <LogoIndexed color={logoColor} />
              </LinkOverlay>
            </LinkBox>
            <LinkBox title={unicornCircleTitle}>
              <LinkOverlay href="https://twitter.com/unicorncircle" target="_blank">
                <LogoUnicornCircle color={logoColor} />
              </LinkOverlay>
            </LinkBox>
            <LinkBox title={goodghostingTitle}>
              <LinkOverlay href="https://goodghosting.com" target="_blank">
                <LogoGoodGhosting color={logoColor} />
              </LinkOverlay>
            </LinkBox>
          </SimpleGrid>
          <Text fontSize={12} mt={4} mb={2} variant="brandSecondary">Thanks to these patrons who has offered to help support the server costs and development!</Text>
          <Text fontSize={12} textAlign="right"><Link href="https://twitter.com/mohamedmansour" target="_blank">Become a patron!</Link></Text>
        </Box>
      </Card>
    )
  }

  if (type === CardDonateType.TopSideBar) {
    return null;
  }

  return (
    <Card title="Current Session">
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
