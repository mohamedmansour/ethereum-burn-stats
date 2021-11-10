import Icon from "@chakra-ui/icon"
import { Link, HStack, Text, Box, Flex } from "@chakra-ui/layout"
import { VscGithub, VscTwitter } from "react-icons/vsc"
import { Card } from "../../atoms/Card"
import { LogoIcon } from "../../atoms/LogoIcon"

export function About() {
  return (
    <>
      <Card title="Creators">
        <Flex direction={{ base: "column", md: "column", lg: "row" }} gridGap={{ base: 4, md: 4, lg: 8 }} >
          <Box>
            <Text variant="brandSecondary">Team: </Text>
            <Link href="https://twitter.com/mohamedmansour">
              <HStack>
                <Icon as={VscTwitter} title="Follow Mohamed Mansour on Twitter" />
                <Text>@mohamedmansour</Text>
              </HStack>
            </Link>
            <Link href="https://github.com/stevengcook">
              <HStack>
                <Icon as={VscGithub} title="Follow Steve Cook on GitHub" />
                <Text>@stevengcook</Text>
              </HStack>
            </Link>
            <Link href="https://twitter.com/erensong" target="_blank">
              <HStack>
                <Icon as={VscTwitter} title="Follow Eren Song on Twitter" />
                <Text>@erensong</Text>
              </HStack>
            </Link>
            <Link href="https://twitter.com/vdWijden" target="_blank">
              <HStack>
                <Icon as={VscTwitter} title="Follow Marius Van Der Wijden on Twitter" />
                <Text>@vdWijden</Text>
              </HStack>
            </Link>
          </Box>

          <Box>
            <Text variant="brandSecondary">Open Sourced: </Text>
            <Link href="https://github.com/mohamedmansour/ethereum-burn-stats" target="_blank">
              <HStack>
                <Icon as={VscGithub} title="Contribute to Ethereum Burn Stats on GitHub" />
                <Text>ethereum-burn-stats</Text>
              </HStack>
            </Link>
          </Box>

          <Box>
            <Text variant="brandSecondary">Tech Stack: </Text>
            <Text>Golang, TypeScript, Chakra</Text>
          </Box>
        </Flex>
      </Card>

      <Card title="History">
        <Text>
          In the <Link href="https://github.com/ethereum-cdap/cohort-zero" target="_blank">Core Developer Apprenticeship Program for the Ethereum
            Foundation</Link>, a new project idea was posted by <Link href="https://twitter.com/vdWijden" target="_blank">@vdWijden</Link> for {" "}
          <Link href="https://github.com/ethereum-cdap/cohort-zero/issues/51" target="_blank">Issue #51</Link> to create an EIP-1559 burn website.
        </Text>
        <Text>
          <Link href="https://twitter.com/mohamedmansour">Mohamed Mansour</Link> jumped in, and been adding features ever since. It went through many iterations
          with the help of the community to be in the state it is today!
        </Text>
      </Card>

      <Card title="About">
        <Text>
          Ethereum <Link href="https://eips.ethereum.org/EIPS/eip-1559" target="_blank">EIP-1559</Link> is an improvement proposal that
          makes changes to the transaction fee system. EIP-1559 got rid of the first-price auction which was a major source of transaction
          fees and replaced it with the base fee model where the fee is changed dynamically based on network activity. The base fee is
          burned <LogoIcon /> and not given to the miners.
        </Text>
        <Text>It was successfully launched on August 4th, 2021.</Text>
        <Text>This website showcases how much has been burned among other neat stats. For more information, Vitalik Buterin {" "}
          <Link href="https://notes.ethereum.org/@vbuterin/eip-1559-faq" target="_blank">wrote a great blog post</Link> explaining
          what it is in detail.
        </Text>
      </Card>
    </>
  )
}
