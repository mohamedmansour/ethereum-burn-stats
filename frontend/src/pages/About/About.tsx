import Icon from "@chakra-ui/icon"
import { Link, HStack, Text, SimpleGrid, Center } from "@chakra-ui/layout"
import { VscGithub, VscTwitter } from "react-icons/vsc"
import { Card } from "../../atoms/Card"
import { LogoIcon } from "../../atoms/LogoIcon"
import { LogoWithTextIcon } from "../../atoms/LogoWithTextIcon"

export function About() {
  return (
    <>
      <Card title="Creators">
        <HStack>
          <Text variant="brandSecondary">Lead Dev and Maintainer: </Text>
          <Link href="https://twitter.com/mohamedmansour">
            <HStack>
              <Icon as={VscTwitter} title="Follow Mohamed Mansour on Twitter" />
              <Text>@mohamedmansour</Text>
            </HStack>
          </Link>
        </HStack>

        <HStack>
          <Text variant="brandSecondary">Lead Designer and Logo: </Text>
          <Link href="https://twitter.com/erensong" target="_blank">
            <HStack>
              <Icon as={VscTwitter} title="Follow Eren Song on Twitter" />
              <Text>@erensong</Text>
            </HStack>
          </Link>
        </HStack>

        <HStack>
          <Text variant="brandSecondary">Open Sourced: </Text>
          <Link href="https://github.com/mohamedmansour/ethereum-burn-stats" target="_blank">
            <HStack>
              <Icon as={VscGithub} title="Contribute to Ethereum Burn Stats on GitHub" />
              <Text>GitHub</Text>
            </HStack>
          </Link>
        </HStack>

        <HStack>
          <Text variant="brandSecondary">Tech Stack: </Text>
          <Text>Golang, TypeScript, Chakra</Text>
        </HStack>

        <HStack>
          <Text variant="brandSecondary">Infra: </Text>
          <Text>Linux, Geth</Text>
        </HStack>
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

      <Card title="Branding">
        <Text>
          The amazing branding was created by Eren Song, and she holds the copyright of the logo. The logo resembles a flame, but in
          a unique way morphed into a letter B for burn. The text is a custom font that looks like an action movie.
        </Text>
        <Text>
          If you need to hire a very experienced and professional designer, please contact her on <Link href="https://twitter.com/erensong" target="_blank">Twitter</Link>!
        </Text>
        <SimpleGrid columns={[1,2]} spacing={4}>
          <Center bg="black" p={4}>
            <LogoWithTextIcon fontSize="90px" color="white" />
          </Center>
          <Center bg="white" p={4}>
            <LogoWithTextIcon fontSize="90px" color="black" />
          </Center>
          <Center bg="black" p={4}>
            <LogoIcon fontSize="250px" color="white" />
          </Center>
          <Center bg="white" p={4}>
            <LogoIcon fontSize="250px" color="black" />
          </Center>
        </SimpleGrid>
      </Card>
    </>
  )
}
