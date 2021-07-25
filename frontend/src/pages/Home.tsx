import {
  Table,
  Text,
  Thead,
  Tr,
  Th,
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
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { FaBurn, FaClock, FaCubes, FaEdit, FaGasPump } from 'react-icons/fa';
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
          color="orange"
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
      <Table colorScheme="whiteAlpha" position="absolute" top={0} bottom={0} left={0} right={0}>
        <Thead>
          <Tr>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Block</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Burned</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Base Fee</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Gas Used</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Gas Limit</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Rewards</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Txn</Th>
            <Th position="sticky" bg="brand.card" top={0} color="brand.secondaryText" zIndex={1}>Age</Th>
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
      </Table>
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
          <Card
            gridGap={4}
            w={["100%", "100%", 300]}
          >
            <HStack pr={10}>
              <Icon as={FaBurn} />
              <Text fontSize="md" fontWeight="bold">
                Statistics
              </Text>
            </HStack>
            <HStack>
            <Text>Tota  </Text>
            <BigNumberText number={details.totalBurned} fontSize={24} />
            </HStack>
          </Card>
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
          {activated && (
            <Card
              gridGap={4}
            >
              <HStack>
                <Icon as={FaEdit} />
                <Text fontSize="md" fontWeight="bold">
                  Session Summary
                </Text>
              </HStack>
              <Box textAlign="left" mt="2" fontSize="sm">
                You've just experienced <BigNumberText number={session.burned} usdConversion={amount} fontWeight="bold" removeCurrencyColor /> being burned by observing <strong>{session.blockCount} blocks</strong>
                {" "}that contain <strong>{session.transactionCount} transactions</strong> with <BigNumberText number={session.rewards} usdConversion={amount} fontWeight="bold" removeCurrencyColor /> rewards!
              </Box>
            </Card>
          )}

          <Card
            gridGap={4}
          >
            <HStack pr={10}>
              <Icon as={FaGasPump} />
              <Text fontSize="md" fontWeight="bold">
                Gas Price
              </Text>
            </HStack>
            <BigNumberText number={details.gasPrice} fontSize={24} />
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
