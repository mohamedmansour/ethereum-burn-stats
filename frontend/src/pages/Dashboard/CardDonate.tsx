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

export function CardDonate() {
  if (process.env.REACT_APP_SHOW_SERVER_SPONSOR === "true") {
    return (
      <Card gridGap={layoutConfig.miniGap}>
        <HStack pr={10}>
          <Icon as={VscHeart} />
          <Text fontSize="md" fontWeight="bold">
            Server Sponsor
          </Text>
        </HStack>
        <Box>
          <LinkBox>
            <LinkOverlay href="https://indexed.finance" target="_blank">
              <Image src="/sponsor_indexed-financed.png" />
            </LinkOverlay>
            <Text fontSize={12} mt={4}>Thanks to <Link href="https://indexed.finance" target="_blank">https://indexed.finance</Link> who has offered to help support the server costs, so please check them out!</Text>
          </LinkBox>
        </Box>
      </Card>
    )
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
