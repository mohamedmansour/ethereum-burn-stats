import {
  Text,
  Thead,
  Tr,
  Tbody,
  Td,
  Link,
  HStack,
  Flex,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Box,
  Icon,
  ListItem,
  UnorderedList,
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { FaBurn, FaClock, FaCubes, FaGasPump } from 'react-icons/fa';
import { timeSince } from "../utils/time";
import { GasUsed } from "../components/GasUsed";
import {
  useBlockExplorer,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";
import { Loader } from "../components/Loader";
import { BlockProgress } from "../components/BlockProgress";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { BigNumberText } from "../components/BigNumberText";
import { useCurrency } from "../contexts/CurrencyContext";
import { BaseFeeChart } from "../components/BaseFeeChart";
import { useEffect, useState } from "react";
import { useEthereum } from "../contexts/EthereumContext";
import { layoutConfig } from "../layoutConfig";
import { ImHeart } from "react-icons/im";
import { TablePlus, ThPlus } from "../components/TablePlus";

interface ActivationCountdownProps {
  blocksRemaining: number
  lastFiveBlocks: BurnedBlockTransaction[]
}
export function ActivationCountdown(props: ActivationCountdownProps) {
  const { eth } = useEthereum();
  const [estimatedTime, setEstimatedTime] = useState<string>()

  useEffect(() => {
    const averageBlockSpeed = props.lastFiveBlocks.slice(1, 5).reduce((prev, curr, currentIndex, array) => {
      if (currentIndex > 0) {
        const currentDiff = curr.timestamp - array[currentIndex - 1].timestamp
        return (prev + currentDiff) / 2
      }
      return curr.timestamp - prev
    }, props.lastFiveBlocks[0].timestamp)

    const activationDate = new Date(Date.now() + Math.abs(averageBlockSpeed) * props.blocksRemaining * 1000)

    const dtf = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'long', timeStyle: 'medium' });
    setEstimatedTime(dtf.format(activationDate))
  }, [props.blocksRemaining, props.lastFiveBlocks])


  return (
    <Card gridGap={4} w="100%" textAlign="center">
      <HStack>
        <Icon as={FaClock} />
        <Text fontSize="md" fontWeight="bold">
          {eth?.connectedNetwork.name} Countdown
        </Text>
      </HStack>
      <Box>
        <Text fontSize="100px" lineHeight="100px">{props.blocksRemaining}</Text>
        <Text color="brand.secondaryText">Blocks Remaining</Text>
      </Box>
      <Box pt="10">
        {!estimatedTime && (<Text>Please wait, calculating approximate time...</Text>)}
        {estimatedTime !== undefined && (
          <>
            <Text fontSize={[22, 22, 32]} lineHeight="30px">{estimatedTime}</Text>
            <Text color="brand.secondaryText">Estimated Activation</Text>
          </>
        )}
      </Box>
    </Card>
  )
}

interface BlockItemProps {
  block: BurnedBlockTransaction;
}

function BlockItem(props: BlockItemProps) {
  const { block } = props;
  return (
    <Tr>
      <Td>
        <Link
          to={`/block/${block.number}`}
          as={ReactLink}
        >
          {block.number}
        </Link>
      </Td>
      <Td>
        <HStack>
          <FirePit size="12px" />
          <BigNumberText number={block.burned} />
        </HStack>
      </Td>
      <Td>
        <BigNumberText number={block.basefee} />
      </Td>
      <Td>
        <GasUsed gasUsed={block.gasUsed} gasLimit={block.gasLimit} />
      </Td>
      <Td><BigNumberText number={block.gasLimit} forced='wei' /></Td>
      <Td><BigNumberText number={block.rewards} /></Td>
      <Td>{block.transactions.length}</Td>
      <Td>{timeSince(block.timestamp as number)}</Td>
    </Tr>
  );
}

function BlockList() {
  const { details, blocks } = useBlockExplorer();

  if (!details) return <Loader>loading block details ...</Loader>;

  if (!blocks) return <Loader>loading blocks ...</Loader>;

  return (
    <Box position="relative" w="100%" h="100%" flex={1} overflow="auto" whiteSpace="nowrap">
      <TablePlus colorScheme="whiteAlpha">
        <Thead>
          <Tr>
            <ThPlus>Block</ThPlus>
            <ThPlus>Burned</ThPlus>
            <ThPlus>Base Fee</ThPlus>
            <ThPlus>Gas Used</ThPlus>
            <ThPlus>Gas Limit</ThPlus>
            <ThPlus>Rewards</ThPlus>
            <ThPlus>Txn</ThPlus>
            <ThPlus>Age</ThPlus>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>{details.currentBlock + 1}</Td>
            <Td colSpan={7}>
              <BlockProgress />
            </Td>
          </Tr>
          {blocks.map((block, idx) => (
            <BlockItem
              key={idx}
              block={block}
            />
          ))}
        </Tbody>
      </TablePlus>
    </Box>
  );
}

export function Home() {
  const { details, session, blocks } = useBlockExplorer();
  const { currency, amount } = useCurrency();
  const { eth } = useEthereum();

  if (!eth) return <Loader>connecting to network ...</Loader>;
  if (!currency || !amount) return <Loader>Loading Currency</Loader>
  if (!details) return <Loader>Loading Details</Loader>
  if (!session) return <Loader>Loading Session</Loader>
  if (!blocks) return <Loader>Loading Blocks</Loader>

  const latestBlock = blocks[0];
  const activated = latestBlock.number > eth.connectedNetwork.genesis

  return (
    <Flex flex={1} direction="column" m={layoutConfig.gap} gridGap={layoutConfig.gap}>
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Dashboard</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      {!activated && (
        <Flex direction={layoutConfig.flexRow} gridGap={layoutConfig.gap} flexShrink={0}>
          <ActivationCountdown blocksRemaining={eth.connectedNetwork.genesis - latestBlock.number} lastFiveBlocks={blocks} />
        </Flex>
      )}
      {activated && (
        <Flex direction={layoutConfig.flexRow} gridGap={layoutConfig.gap} h={["auto", "auto", 300]} flexShrink={0}>
          <Flex direction="column" gridGap={layoutConfig.gap}>
            <Card
              gridGap={2}
              w={["100%", "100%", 300]}
            >
              <HStack pr={10}>
                <Icon as={FaBurn} />
                <Text fontSize="md" fontWeight="bold">
                  Total Burned
                </Text>
              </HStack>
              <BigNumberText number={details.totalBurned} usdConversion={amount} fontSize={24} textAlign="right" />
            </Card>
            <Card
              gridGap={2} flex="1"
              w={["100%", "100%", 300]}
            >
              <HStack pr={10}>
                <Icon as={FaBurn} />
                <Text fontSize="md" fontWeight="bold">
                  Current Session
                </Text>
              </HStack>
              <HStack>
                <Text flex={1}>Burned</Text>
                <BigNumberText number={session.burned} usdConversion={amount} fontSize={18} />
              </HStack>
              <HStack>
                <Text flex={1}>Rewards</Text>
                <BigNumberText number={session.rewards} usdConversion={amount} fontSize={18} />
              </HStack>
              <HStack>
                <Text flex={1}>Blocks</Text>
                <Text fontSize={18}>{session.blockCount}</Text>
              </HStack>
            </Card>
          </Flex>
          <Card
            gridGap={4}
            flex={1}
            h={[300, 300, "auto"]}
          >
            <HStack>
              <Icon as={FaGasPump} />
              <Text fontSize="md" fontWeight="bold">
                Live Burn Chart
              </Text>
            </HStack>
            <BaseFeeChart data={blocks} activated={activated ? 1 : 0} />
          </Card>
        </Flex>
      )}
      <Flex flex={1} direction={layoutConfig.flexRow} gridGap={layoutConfig.gap}>
        <Flex direction="column" w={["100%", "100%", 300]} flexShrink={0} gridGap={layoutConfig.gap}>
          <Card gridGap={4}>
            <HStack pr={10}>
              <Icon as={FaGasPump} />
              <Text fontSize="md" fontWeight="bold">
                Gas Price
              </Text>
            </HStack>
            <BigNumberText number={details.gasPrice} fontSize={24} textAlign="right" />
          </Card>
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
        </Flex>
        <Flex direction="column" flex={1}>
          <Card
            gridGap={4}
            flex={['auto', 'auto', 1]}
            h={[600, 600, "auto"]}
          >
            <HStack>
              <Icon as={FaCubes} />
              <Text fontSize="md" fontWeight="bold">
                Blocks
              </Text>
            </HStack>
            <BlockList />
          </Card>
        </Flex>
      </Flex>
    </Flex>
  )
}
