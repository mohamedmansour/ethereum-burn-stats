import { Flex, HStack, Text, Icon, Link, Tooltip } from "@chakra-ui/react";
import { VscTwitter, VscGithub } from "react-icons/vsc";
import { ImHeart } from "react-icons/im";

export function Footer() {
  return (
    <Flex
      align="center" justify="center"
      gridGap={[0, 0, 8]}
      mb="4"
      mt="2"
      color="#666"
      direction={["column", "column", "row"]}
    >
      <HStack gridGap="8">
        <Link href="https://twitter.com/mohamedmansour">
          <HStack>
            <Icon as={VscTwitter} title="Follow Mohamed Mansour on Twitter" />
            <Text>@mohamedmansour</Text>
          </HStack>
        </Link>
        <Link href="https://twitter.com/vdWijden">
          <HStack>
            <VscTwitter title="Follow Marius Van Der Wijdenme on Twitter" />
            <Text>@vdWijden</Text>
          </HStack>
        </Link>
      </HStack>
      <HStack gridGap="8">
        <Link href="https://github.com/mohamedmansour/eth-burn">
          <HStack>
            <Icon as={VscGithub} title="View source code on GitHub" />
            <Text>Source code</Text>
          </HStack>
        </Link>
        <Link href="https://gitcoin.co/grants/1709/ethereum-2-educational-grant">
          <HStack>
            <Icon as={ImHeart} color="brand.orange" />
            <Tooltip label="Please help support the server costs, hosting Geth is not cheap 🖤 You can donate through Gitcon Grant, or directly to my ENS mansour.eth"  bg="brand.orange" textAlign="center" hasArrow placement="top">
              <Text>Donate</Text>
            </Tooltip>
          </HStack>
        </Link>
      </HStack>
    </Flex>
  );
}
