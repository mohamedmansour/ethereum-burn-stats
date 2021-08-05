import {
  Text,
  Link,
  Image,
  HStack, Box,
  Icon,
  ListItem,
  UnorderedList,
  LinkOverlay,
  LinkBox
} from "@chakra-ui/react";
import { Card } from "../../atoms/Card";
import { ImHeart } from "react-icons/im";
import { VscHeart } from "react-icons/vsc";
import { layoutConfig } from "../../layoutConfig";


export enum CardDonateType {
  TopSideBar,
  BottomSideBar
}

export function CardDonate({type}: {type: CardDonateType}) {
  if (process.env.REACT_APP_SHOW_SERVER_SPONSOR === "true") {
    if (type === CardDonateType.TopSideBar) {
      const title = "nansen.ai: identify opportunities before everyone else. Analyses 90M+ labeled ethereum wallets and their activity.";
      return (
        <Card gridGap={layoutConfig.miniGap} textAlign="center">
          <Box>
            <LinkBox title={title}>
              <LinkOverlay href="https://www.nansen.ai" target="_blank" display="flex" justifyContent="center" alignItems="center">
                <Text color="brand.secondaryText">Sponsored by</Text>
                <Image w="87px" h="30px" srcSet="/sponsor_nansen.png" ml={4} alt={title} />
              </LinkOverlay>
            </LinkBox>
          </Box>
        </Card>
      )
    }

    const title = "indexed.finance: defi investing made easy, crypto indexes and yield aggregators"
    return (
      <Card gridGap={layoutConfig.miniGap}>
        <HStack pr={10}>
          <Icon as={VscHeart} />
          <Text fontSize="md" fontWeight="bold">
            Patrons
          </Text>
        </HStack>
        <Box>
          <LinkBox title={title}>
            <LinkOverlay href="https://indexed.finance" target="_blank">
              <Image w="150px" h="60px" srcSet="/sponsor_indexed-financed.png" title={title} />
            </LinkOverlay>
          </LinkBox>
          <Text fontSize={12} mt={4}>Thanks to these patrons who has offered to help support the expensive server costs!</Text>
          <Text fontSize={12} textAlign="right"><Link href="https://twitter.com/mohamedmansour">Become a patron!</Link></Text>
        </Box>
      </Card>
    )
  }

  if (type === CardDonateType.TopSideBar) {
    return null;
  }

  return (
    <Card gridGap={layoutConfig.miniGap}>
      <HStack pr={10}>
        <Icon as={ImHeart} color="brand.orange" />
        <Text fontSize="md" fontWeight="bold">
          Donate
        </Text>
      </HStack>
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
