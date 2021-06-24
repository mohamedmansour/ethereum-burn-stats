import {
  Box,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Text,
  Tooltip,
  useRadio,
  useRadioGroup,
  UseRadioProps,
  VStack,
} from "@chakra-ui/react";
import { ethers, utils } from "ethers";
import React from "react";
import { Link as ReactLink } from "react-router-dom";
import { BlockProgress } from "../components/BlockProgress";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { Footer } from "../components/Footer";
import { Loader } from "../components/Loader";
import { EthereumNetwork } from "../components/Network";
import {
  BurnedBlockTransaction,
  useBlockExplorer,
} from "../contexts/BlockExplorerContext";
import { timeSince } from "../utils/time";
import { formatBigNumber } from "../utils/wei";

interface BlockItemProps {
  number: number;
  timestamp: number;
  burned: ethers.BigNumber;
  basefee: ethers.BigNumber;
  gasLimit: ethers.BigNumber;
  gasUsed: ethers.BigNumber;
}

function BlockItem(props: BlockItemProps) {
  const label = (
    <Text>
      Burned: {formatBigNumber(props.burned, false)} wei
      <br />
      Base Fee: {formatBigNumber(props.basefee, false)} wei
      <br />
      Gas used: {((props.gasUsed.toNumber() / props.gasLimit.toNumber()) * 100).toFixed(2)}%
    </Text>
  );

  return (
    <HStack m="2">
      <Flex flex="1" align="flex-start" direction="column">
        <Box>
          <Link as={ReactLink} to={`/block/${props.number}`}>
            Block {props.number}
          </Link>
        </Box>
        <Box fontSize="14px" mt="0" color="brand.secondaryText">
          {timeSince(props.timestamp)}
        </Box>
      </Flex>
      <HStack
        bg="brand.subheaderCard"
        pl="4"
        pr="4"
        pt="2"
        pb="2"
        rounded="full"
        align="center"
      >
        <FirePit size="12px" />
        <Box w="70px" whiteSpace="nowrap">
          <Tooltip hasArrow label={label} placement="right">
            {formatBigNumber(props.burned, true)}
          </Tooltip>
        </Box>
      </HStack>
    </HStack>
  );
}

interface CurrentBlockProps {
  block: BurnedBlockTransaction;
}

function CurrentBlock(props: CurrentBlockProps) {
  return (
    <HStack m="2">
      <Flex flex="1" align="flex-start" direction="column">
        <Box>Block {props.block.number + 1}</Box>
        <Box fontSize="14px" mt="0" color="brand.secondaryText">
          pending
        </Box>
      </Flex>
      <HStack
        bg="brand.subheaderCard"
        pl="4"
        pr="4"
        pt="2"
        pb="2"
        rounded="full"
        align="center"
      >
        <BlockProgress
          totalSecondsPerBlock={30}
          block={props.block}
          w="90px"
          h="24px"
        />
      </HStack>
    </HStack>
  );
}

interface LatestBlocksProps {
  latestBlock: BurnedBlockTransaction;
  renderedBlocks: BurnedBlockTransaction[];
}

function LatestBlocksCard(props: LatestBlocksProps) {
  const { latestBlock, renderedBlocks } = props

  return (
    <Card bg="brand.card" zIndex={2} p="4" w="100%">
      <Heading size="sm" textAlign="center" color="brand.headerText">
        Latest Blocks
      </Heading>
      <CurrentBlock block={latestBlock} />
      <Divider bg="brand.card" borderColor="brand.card" />
      {renderedBlocks.map((block, idx) => (
        <BlockItem key={idx} {...block} />
      ))}

      <Divider bg="brand.card" borderColor="brand.card" />

      <Link
        as={ReactLink}
        to="/blocks"
        mt="4"
        textAlign="center"
        zIndex={2}
        size="sm"
      >
        View all blocks
      </Link>
    </Card>
  )
}

interface SessionSummaryProps {
  totalBurned: string
  blockCount: number
  transactionCount: number
  totalRewards: string
}

function SessionSummaryCard(props: SessionSummaryProps) {
  return (
    <Card>
      <Heading size="sm" textAlign="center" color="brand.headerText">
        Session Summary
      </Heading>
      <Text color="brand.primaryText" textAlign="left" mt="2" p="4">
        You've just experienced <strong>{props.totalBurned}</strong> being burned by observing <strong>{props.blockCount} blocks</strong>
        that contain <strong>{props.transactionCount} transactions</strong> with <strong>{props.totalRewards}</strong> rewards!
      </Text>
    </Card>
  )
}

interface CurrencySelectorCardProps extends UseRadioProps {
  children: React.ReactNode;
}

function CurrencySelectorCard(props: CurrencySelectorCardProps) {
  const { getInputProps, getCheckboxProps } = useRadio(props)
  const input = getInputProps()
  const checkbox = getCheckboxProps()

  return (
    <Box as="label">
      <input {...input} />
      <Box
        {...checkbox}
        cursor="pointer"
        fontWeight="bold"
        _checked={{
          color: "brand.orange",
        }}
        _focus={{
          boxShadow: "outline",
        }}
      >
        {props.children}
      </Box>
    </Box>
  )
}

function FireAnimation() {
  return (
    <Center position="fixed" bottom="0" fontSize={["50px", "80px", "100px"]}>
      <FirePit
        size="0.8em"
        sparkCount={12}
        zIndex={1}
        position="absolute"
        bottom="0"
      />
      <FirePit
        size="0.4em"
        ml="-1.8em"
        sparkCount={12}
        zIndex={1}
        position="absolute"
        bottom="0"
      />
      <FirePit
        size="0.4em"
        ml="1.8em"
        sparkCount={12}
        zIndex={1}
        position="absolute"
        bottom="0"
      />
    </Center>
  )
}

function Header() {
  return (
    <Box mt="2" mb="2" textAlign="left" w="100%" position="relative">
      <Box>
        <Heading>
          <HStack>
            <Text>Watch The</Text>
            <Box display="inline" color="brand.orange">
              Burn
            </Box>
          </HStack>
        </Heading>
        <Text>Ethereum's EIP-1559</Text>
      </Box>
      <EthereumNetwork position="absolute" bottom="0" right="0" />
    </Box>
  )
}

export function Home() {
  const { details, blocks, session } = useBlockExplorer();

  if (!details) return <Loader>Loading block details ...</Loader>;

  if (!blocks) return <Loader>Loading blocks ...</Loader>;

  if (!session) return <Loader>Loading session ...</Loader>;

  // Total Burned
  const currency = 'ETH';
  const totalBurned = utils.formatEther(details.totalBurned);
  const totalBurnedSplitter = totalBurned.indexOf(".");
  const totalBurnedWholeNumber = utils.commify(totalBurned.substr(0, totalBurnedSplitter));
  const totalBurnedDecimalNumber = totalBurned.substr(totalBurnedSplitter + 1);

  // Stats
  const sessionTotalBurned = utils.commify(utils.formatEther(session.burned))
  const sessionTotalRewards = utils.commify(utils.formatEther(session.rewards))

  const latestBlock = blocks[0];
  const renderedBlocks = blocks.slice(0, 5);

  return (
    <Center
      display="fixed"
      t="0"
      l="0"
      w="100%"
      h="100%"
      bg="brand.background"
      overflowY="auto"
    >
      <VStack
        zIndex={2}
        color="brand.primaryText"
        w={["95%", "90%", "700px"]}
        pb="100"
      >
        <Header />
        <Card bg="brand.card" zIndex={2} p="4" w="100%" textAlign="center">
          <Heading size="sm" color="brand.headerText">
            Total Fees Burned
          </Heading>
          <HStack
            alignItems="baseline"
            overflow="hidden"
            wordBreak="break-all"
            whiteSpace="nowrap"
            justify="center"
          >
            <Text fontSize={["32px", "50px", "90px"]} fontWeight="bold">
              {totalBurnedWholeNumber}.
            </Text>
            <Text fontSize={["18px", "22px", "32px"]}>
              {totalBurnedDecimalNumber}
            </Text>
            <Text fontSize={["18px", "22px", "32px"]} color="brand.orange">
              {currency}
            </Text>
          </HStack>
        </Card>
        <SessionSummaryCard totalBurned={sessionTotalBurned} totalRewards={sessionTotalRewards} transactionCount={session.transactionCount} blockCount={session.blockCount} />
        <LatestBlocksCard latestBlock={latestBlock} renderedBlocks={renderedBlocks} />
        <Footer />
      </VStack>
      <FireAnimation />
    </Center>
  );
}
