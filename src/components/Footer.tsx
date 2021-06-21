import { Flex, HStack, Text, Icon, Link } from "@chakra-ui/react";
import { VscTwitter, VscGithub, VscHeart } from "react-icons/vsc";

export function Footer() {
    return (
      <Flex justifyContent="center" gridGap={[0, 0, 8]} color="#666" direction={["column", "column", "row"]}>
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
          <Link
            href="https://github.com/mohamedmansour/eth-burn"
          >
            <HStack>
              <Icon as={VscGithub} title="View source code on GitHub" />
              <Text>Source code</Text>
            </HStack>
          </Link>
          <Link
            href="https://gitcoin.co/grants/1709/ethereum-2-educational-grant"
          >
            <HStack>
              <Icon as={VscHeart} />
              <Text>Donate server costs</Text>
            </HStack>
          </Link>
        </HStack>
      </Flex>
    )
}