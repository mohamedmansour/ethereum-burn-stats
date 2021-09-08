import { Flex, HStack, Text, Icon, Link } from "@chakra-ui/react";
import { VscTwitter, VscGithub } from "react-icons/vsc";
import { ImHeart } from "react-icons/im";
import { layoutConfig } from "../layoutConfig";
import { TooltipPlus } from "../atoms/TooltipPlus";

export function Footer() {
  return (
    <Flex
      align="center" justify="center"
      gridGap={{ base: 0, md: 8 }}
      mb={4}
      mt={2}
      direction={layoutConfig.flexRow}
    >
      <HStack gridGap="8">
        <Link href="https://twitter.com/mohamedmansour" variant="alpha">
          <HStack>
            <Icon as={VscTwitter} title="Follow Mohamed Mansour on Twitter" />
            <Text>@mohamedmansour</Text>
          </HStack>
        </Link>
        <Link href="https://twitter.com/vdWijden" variant="alpha">
          <HStack>
            <VscTwitter title="Follow Marius Van Der Wijdenme on Twitter" />
            <Text>@vdWijden</Text>
          </HStack>
        </Link>
      </HStack>
      <HStack gridGap="8">
        <Link href="https://github.com/mohamedmansour/ethereum-burn-stats" variant="alpha">
          <HStack>
            <Icon as={VscGithub} title="View source code on GitHub" />
            <Text>Source code</Text>
          </HStack>
        </Link>
        <Link href="https://gitcoin.co/grants/1709/ethereum-tools-and-educational-grant" variant="alpha">
          <HStack>
            <Icon as={ImHeart} color="brand.orange" />
            <TooltipPlus label="Please help support the server costs, hosting Geth is not cheap 🖤 You can donate through Gitcon Grant, or through website sponsorships." textAlign="center" placement="top">
              <Text>Donate</Text>
            </TooltipPlus>
          </HStack>
        </Link>
      </HStack>
    </Flex>
  );
}
