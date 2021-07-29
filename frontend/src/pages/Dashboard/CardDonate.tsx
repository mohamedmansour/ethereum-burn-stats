import {
  Text,
  Link,
  HStack, Box,
  Icon,
  ListItem,
  UnorderedList
} from "@chakra-ui/react";
import { Card } from "../../atoms/Card";
import { ImHeart } from "react-icons/im";

export function CardDonate() {
  return (
    <Card gridGap={4}>
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
