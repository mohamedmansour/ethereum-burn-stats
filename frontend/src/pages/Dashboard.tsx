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
  Tooltip,
  Heading,
} from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { FaBurn, FaChartLine, FaClock, FaCubes, FaGasPump, FaWaveSquare } from 'react-icons/fa';
import { timeSince } from "../utils/time";
import { GasUsed, GasUsedPercent, GasTarget } from "../organisms/GasUsed";
import {
  useBlockExplorer,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";
import { Loader } from "../organisms/Loader";
import { BlockProgress } from "../atoms/BlockProgress";
import { Card } from "../atoms/Card";
import { FirePit } from "../atoms/FirePit";
import { BigNumberText } from "../organisms/BigNumberText";
import { useCurrency } from "../contexts/CurrencyContext";
import { BaseFeeChart } from "../organisms/BaseFeeChart";
import { useEffect, useState } from "react";
import { useEthereum } from "../contexts/EthereumContext";
import { layoutConfig } from "../layoutConfig";
import { ImHeart } from "react-icons/im";
import { TablePlus, ThPlus } from "../atoms/TablePlus";
import { VscInfo } from "react-icons/vsc";

interface ActivationCountdownProps {
  genesisBlock: number
  currentBlock: number
}

interface ActivationObj {
  blocksRemaining: number
  estimatedTime: string
}
export function ActivationCountdown(props: ActivationCountdownProps) {
  const { eth } = useEthereum();
  const [timePerBlockInMs, setTimePerBlockInMs] = useState(0);
  const [activation, setActivation] = useState<ActivationObj>();
  const numberOfBlocksToLookback = 400; // ~400 blocks in a day

  // To save on number of calls to geth, just cache the seconds per block.
  useEffect(() => {
    if (!eth) return;
    const run = async () => {
      const currentBlock = await eth.getBlock(props.currentBlock);
      const previousBlock = await eth.getBlock(props.currentBlock - numberOfBlocksToLookback);
      setTimePerBlockInMs(((currentBlock.timestamp - previousBlock.timestamp) * 1000) / numberOfBlocksToLookback);
    }

    run();
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const blocksRemaining = props.genesisBlock - props.currentBlock;
    const activationDate = new Date(Date.now() + timePerBlockInMs * blocksRemaining)
    const dtf = new Intl.DateTimeFormat(navigator.language, { dateStyle: 'long', timeStyle: 'long' });
    const estimatedTime = dtf.format(activationDate);
    setActivation({
      blocksRemaining,
      estimatedTime
    })
  }, [props.genesisBlock, props.currentBlock, timePerBlockInMs])

  if (!activation) {
    return <Text>Please wait, calculating approximate time...</Text>
  }

  return (
    <Card gridGap={4} w="100%" textAlign="center">
      <HStack>
        <Icon as={FaClock} />
        <Text fontSize="md" fontWeight="bold">
          {eth?.connectedNetwork.name} Countdown
        </Text>
      </HStack>
      <Box>
        <Text fontSize="100px" lineHeight="100px">{activation.blocksRemaining}</Text>
        <Text color="brand.secondaryText">Blocks Remaining</Text>
      </Box>
      <Box pt="10">
        <Text fontSize={[22, 22, 32]} lineHeight="30px">{activation.estimatedTime}</Text>
        <Text color="brand.secondaryText">Estimated Activation</Text>
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
      <Td><BigNumberText number={block.basefee} /></Td>
      <Td><GasTarget gasUsed={block.gasUsed} gasLimit={block.gasLimit} /></Td>
      <Td><GasUsed gasUsed={block.gasUsed} gasLimit={block.gasLimit} /></Td>
      <Td><GasUsedPercent gasUsed={block.gasUsed} gasLimit={block.gasLimit} /></Td>
      <Td><BigNumberText number={block.rewards} /></Td>
      <Td>{block.transactions.length}</Td>
      <Td>{timeSince(block.timestamp as number)}</Td>
    </Tr>
  );
}

function GasUsedInfo() {
  return (
    <Box p={4}>
      <Heading size="sm">Gas used is % of gas target</Heading>
      <UnorderedList mt={4}>
        <ListItem>100% == no change in base fee</ListItem>
        <ListItem>200% == 12.5% increase in base fee</ListItem>
        <ListItem>0% == 12.5% decrease in base fee</ListItem>
      </UnorderedList>
    </Box>
  )
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
            <ThPlus>Gas Target</ThPlus>
            <ThPlus><HStack><Text>Gas Used</Text><Tooltip placement="top" label={<GasUsedInfo />}><Box><Icon as={VscInfo} fontSize={16}/></Box></Tooltip></HStack></ThPlus>
            <ThPlus>% Full</ThPlus>
            <ThPlus>Rewards</ThPlus>
            <ThPlus>Txn</ThPlus>
            <ThPlus>Age</ThPlus>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <Td>{details.currentBlock + 1}</Td>
            <Td colSpan={8}>
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
      <Flex flex={1} direction={layoutConfig.flexRow} gridGap={layoutConfig.gap}>
        <Flex direction="column" w={["100%", "100%", 300]} flexShrink={0} gridGap={layoutConfig.gap}>
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
          <Card gridGap={4}>
            <HStack pr={10}>
              <Icon as={FaWaveSquare} />
              <Text fontSize="md" fontWeight="bold">
                Current Session
              </Text>
            </HStack>
            <HStack>
              <Text flex={1}>Burned</Text>
              <BigNumberText number={session.burned} usdConversion={amount} fontSize={16} />
            </HStack>
            <HStack>
              <Text flex={1}>Rewards</Text>
              <BigNumberText number={session.rewards} usdConversion={amount} fontSize={16} />
            </HStack>
            <HStack>
              <Text flex={1}>Blocks</Text>
              <Text fontSize={16}>{session.blockCount}</Text>
            </HStack>
            <HStack>
              <Text flex={1}>Lowest Base Fee</Text>
              <BigNumberText number={session.minBaseFee} fontSize={16} />
            </HStack>
            <HStack>
              <Text flex={1}>Highest Base Fee</Text>
              <BigNumberText number={session.maxBaseFee} fontSize={16} />
            </HStack>
          </Card>
          <Card gridGap={4}>
            <HStack pr={10}>
              <Icon as={FaGasPump} />
              <Text fontSize="md" fontWeight="bold">
                Latest Stats
              </Text>
            </HStack>
            <HStack>
              <Text flex={1}>Base Fee</Text>
              <BigNumberText number={details.currentBaseFee} fontSize={16} textAlign="right" />
            </HStack>
            <HStack>
              <Text flex={1}>Gas Price</Text>
              <BigNumberText number={details.gasPrice} fontSize={16} textAlign="right" />
            </HStack>
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
        <Flex direction="column" flex={1} gridGap={layoutConfig.gap}>
          {!activated && (
            <ActivationCountdown genesisBlock={eth.connectedNetwork.genesis} currentBlock={latestBlock.number} />
          )}
          {activated && (
            <Card
              gridGap={4}
              h={["auto", "auto", 300]} flexShrink={0}
            >
              <HStack>
                <Icon as={FaChartLine} />
                <Text fontSize="md" fontWeight="bold">
                  Live Base Fee Chart
                </Text>
              </HStack>
              <BaseFeeChart data={blocks} activated={activated ? 1 : 0} />
            </Card>
          )}
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
