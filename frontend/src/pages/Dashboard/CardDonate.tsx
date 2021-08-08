import {
  Text,
  Link,
  Image,
  HStack,
  Box,
  Icon,
  ListItem,
  UnorderedList,
  LinkOverlay,
  LinkBox,
  Spacer,
  SimpleGrid
} from "@chakra-ui/react";
import { Card } from "../../atoms/Card";
import { ImHeart } from "react-icons/im";
import { VscHeart } from "react-icons/vsc";


export enum CardDonateType {
  TopSideBar,
  BottomSideBar
}

export function CardDonate({ type }: { type: CardDonateType }) {
  if (process.env.REACT_APP_SHOW_SERVER_SPONSOR === "true") {
    if (type === CardDonateType.TopSideBar) {
      const title = "nansen.ai: identify opportunities before everyone else. Analyses 90M+ labeled ethereum wallets and their activity.";
      return (
        <Card minH="56px">
          <LinkBox title={title} whiteSpace="nowrap">
            <LinkOverlay href="https://www.nansen.ai" target="_blank" display="flex">
              <HStack flex={1}>
                <Icon as={VscHeart} />
                <Text fontSize="md" fontWeight="bold" flex={1}>
                  Sponsored By
                </Text>
                <Spacer />
                <Image w="87px" h="30px" srcSet="/sponsor_nansen.png" ml={4} alt={title} />
              </HStack>
            </LinkOverlay>
          </LinkBox>
        </Card>
      )
    }

    const title = "indexed.finance: defi investing made easy, crypto indexes and yield aggregators"
    return (
      <Card 
          title="Patrons"
          icon={VscHeart}>
        <Box>
          <SimpleGrid columns={2} gridGap={2} mt={2}>
            <LinkBox title={title}>
              <LinkOverlay href="https://indexed.finance" target="_blank">
                <Image srcSet="/sponsor_indexed.png" title={title} />
              </LinkOverlay>
            </LinkBox>
          </SimpleGrid>
          <Text fontSize={12} mt={4} mb={2}>Thanks to these patrons who has offered to help support the expensive server costs!</Text>
          <Text fontSize={12} textAlign="right"><Link href="https://twitter.com/mohamedmansour" target="_blank">Become a patron!</Link></Text>
        </Box>
      </Card>
    )
  }

  if (type === CardDonateType.TopSideBar) {
    return null;
  }

  return (
    <Card 
        title="Current Session"
        icon={ImHeart}>
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
