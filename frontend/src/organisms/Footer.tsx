import { Flex, HStack, Text, Icon, Link, Tooltip } from "@chakra-ui/react";
import { VscTwitter, VscGithub } from "react-icons/vsc";
import { ImHeart } from "react-icons/im";
import { layoutConfig } from "../layoutConfig";

export function Footer() {
  return (
    <Flex
      align="center" justify="center"
      gridGap={[0, 0, 8]}
      mb={4}
      mt={2}
      color="#666"
      direction={layoutConfig.flexRow}
    >
      <HStack gridGap="8">
        <Link href="https://twitter.com/mohamedmansour" color="whiteAlpha.500">
          <HStack>
            <Icon as={VscTwitter} title="Follow Mohamed Mansour on Twitter" />
            <Text>@mohamedmansour</Text>
          </HStack>
        </Link>
        <Link href="https://twitter.com/vdWijden" color="whiteAlpha.500">
          <HStack>
            <VscTwitter title="Follow Marius Van Der Wijdenme on Twitter" />
            <Text>@vdWijden</Text>
          </HStack>
        </Link>
      </HStack>
      <HStack gridGap="8">
        <Link href="https://github.com/mohamedmansour/ethereum-burn-stats" color="whiteAlpha.500">
          <HStack>
            <Icon as={VscGithub} title="View source code on GitHub" />
            <Text>Source code</Text>
          </HStack>
        </Link>
        <Link href="https://gitcoin.co/grants/1709/ethereum-tools-and-educational-grant" color="whiteAlpha.500">
          <HStack>
            <Icon as={ImHeart} color="brand.orange" />
            <Tooltip label="Please help support the server costs, hosting Geth is not cheap 🖤 You can donate through Gitcon Grant, or through website sponsorships."  bg="brand.orange" textAlign="center" hasArrow placement="top">
              <Text>Donate</Text>
            </Tooltip>
          </HStack>
        </Link>
      </HStack>
    </Flex>
  );
}
