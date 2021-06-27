import {
  Box,
  Center,
  Divider,
  Flex,
  Heading,
  HStack,
  Link,
  Text,
  useRadio,
  useRadioGroup,
  UseRadioProps,
  VStack,
} from "@chakra-ui/react";
import { ethers, utils } from "ethers";
import React from "react";
import { useEffect } from "react";
import { useState } from "react";
import { Link as ReactLink } from "react-router-dom";
import { BigNumberText } from "../components/BigNumberFormat";
import { BlockProgress } from "../components/BlockProgress";
import { Card } from "../components/Card";
import { FirePit } from "../components/FirePit";
import { Footer } from "../components/Footer";
import { Loader } from "../components/Loader";
import { EthereumNetworkBadge } from "../components/Network";
import {
  BlockExplorerSession,
  BurnedBlockTransaction,
  useBlockExplorer,
} from "../contexts/BlockExplorerContext";
import { Currency, CurrencyProvider, useCurrency } from "../contexts/CurrencyContext";
import { useEthereum } from "../contexts/EthereumContext";
import { timeSince } from "../utils/time";

interface BlockItemProps {
  number: number;
  timestamp: number;
  burned: ethers.BigNumber;
  basefee: ethers.BigNumber;
  gasLimit: ethers.BigNumber;
  gasUsed: ethers.BigNumber;
  currency: Currency;
  amount: number
}

function BlockItem(props: BlockItemProps) {
  const label = (
    <Box>
      Burned: <BigNumberText number={props.burned} disableTooltip doNotShortenDecimals />
      <br />
      Base Fee: <BigNumberText number={props.basefee} />
      <br />
      Gas used: {((props.gasUsed.toNumber() / props.gasLimit.toNumber()) * 100).toFixed(2)}%
    </Box>
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
        <BigNumberText number={props.burned} label={label} usdConversion={props.amount} w="110px" />
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
          w="130px"
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
  const { currency, amount } = useCurrency()
  const { latestBlock, renderedBlocks } = props

  if (!currency || !amount)
    return null
    
  return (
    <Card bg="brand.card" zIndex={2} p="4" w="100%">
      <Heading size="sm" textAlign="center" color="brand.headerText">
        Latest Blocks
      </Heading>
      <CurrentBlock block={latestBlock} />
      <Divider bg="brand.card" borderColor="brand.card" />
      {renderedBlocks.map((block, idx) => (
        <BlockItem key={idx} {...block} currency={currency} amount={amount}/>
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
  session: BlockExplorerSession
}

function SessionSummaryCard(props: SessionSummaryProps) {
  const { currency, amount } = useCurrency()
  if (!currency || !amount)
    return null

  return (
    <Card>
      <Heading size="sm" textAlign="center" color="brand.headerText">
        Session Summary
      </Heading>
      <Box color="brand.primaryText" textAlign="left" mt="2" p="4">
        You've just experienced <BigNumberText number={props.session.burned} usdConversion={amount} fontWeight="bold" removeCurrencyColor /> being burned by observing <strong>{props.session.blockCount} blocks</strong>
        {" "}that contain <strong>{props.session.transactionCount} transactions</strong> with <BigNumberText number={props.session.rewards} usdConversion={amount}  fontWeight="bold" removeCurrencyColor /> rewards!
      </Box>
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

interface TotalFeesCardProps {
  totalBurned: ethers.BigNumber
}

function CurrencySwitcher() {
  const state = useCurrency()
  const { getRootProps, getRadioProps } = useRadioGroup({
    name: "currency",
    defaultValue: "ETH",
    onChange: (e: Currency) => state.setCurrency(e)
  })

  if (!state.currency || !state.amount)
    return null

  const group = getRootProps()
  const options = ["ETH", "USD"]

  return (
    <HStack {...group} justify="center">
    {options.map((value) => {
      const radio = getRadioProps({ value })
      return (
        <CurrencySelectorCard key={value} {...radio}>
          {value}
        </CurrencySelectorCard>
      )
    })}
    </HStack>
  )
}
  
function TotalFeesCard(props: TotalFeesCardProps) {
  const state = useCurrency()
  if (!state.currency || !state.amount)
    return null

  const isEthereumCurrency = state.currency === 'ETH'
  const symbol = isEthereumCurrency ? '' : '$'
  const totalBurnedInEth = utils.formatEther(props.totalBurned.mul(state.amount));
  const totalBurnedSplitter = totalBurnedInEth.indexOf(".");
  const totalBurnedWholeNumber = symbol + utils.commify(totalBurnedInEth.substr(0, totalBurnedSplitter));
  const totalBurnedDecimalNumber = totalBurnedInEth.substr(totalBurnedSplitter + 1, isEthereumCurrency ? 6 : 2);


  return (
    <Card bg="brand.card" zIndex={2} p="4" w="100%" textAlign="center">
      <Heading size="sm" color="brand.headerText">
        Total Fees Burned
      </Heading>
      <Flex
        alignItems="baseline"
        overflow="hidden"
        wordBreak="break-all"
        whiteSpace="nowrap"
        justify="center"
      >
        <Text fontSize={["4vh", "5vh", "6vh"]} fontWeight="bold">
          {totalBurnedWholeNumber}.
        </Text>
        <Text fontSize={["2vh", "2vh", "3vh"]}>
          {totalBurnedDecimalNumber}
        </Text>
      </Flex>
      <CurrencySwitcher />
    </Card>
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
      <EthereumNetworkBadge position="absolute" bottom="0" right="0" />
    </Box>
  )
}

interface ActivationCountdownProps {
  blocksRemaining: number
  lastFiveBlocks: BurnedBlockTransaction[]
}
export function ActivationCountdown(props: ActivationCountdownProps) {
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
  <Card bg="brand.card" zIndex={2} p="4" w="100%" textAlign="center">
    <Heading size="sm" color="brand.headerText">
       Activation Countdown
    </Heading>
    <VStack align="center" justify="center" p="10">
      <Box>
        <Text fontSize="100px" lineHeight="100px">{props.blocksRemaining}</Text>
        <Text color="brand.secondaryText">Blocks Remaining</Text>
      </Box>
      <Box pt="10" pb="10">
        {!estimatedTime && (<Text>Please wait, calculating approximate time...</Text>) }
        {estimatedTime !== undefined && (
          <>
            <Text fontSize="30px" lineHeight="30px">{estimatedTime}</Text>
            <Text color="brand.secondaryText">Estimated Activation</Text>
          </>
        )}
      </Box>
      <Divider bg="brand.card" borderColor="brand.card" />
      <BlockProgress w="100%" h="10px"/> 
    </VStack>
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

export function Home() {
  const { details, blocks, session } = useBlockExplorer();
  const { eth } = useEthereum();

  if (!eth) return <Loader>Connecting to network ...</Loader>;

  if (!details) return <Loader>Loading block details ...</Loader>;

  if (!blocks) return <Loader>Loading blocks ...</Loader>;

  if (!session) return <Loader>Loading session ...</Loader>;

  const latestBlock = blocks[0];
  const renderedBlocks = blocks.slice(0, 5);

  const activated = latestBlock.number > eth.connectedNetwork.genesis

  return (
    <CurrencyProvider>
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
          {!activated && (<ActivationCountdown blocksRemaining={eth.connectedNetwork.genesis - latestBlock.number} lastFiveBlocks={renderedBlocks}/>)}
          {activated && (
            <>
              <TotalFeesCard totalBurned={details.totalBurned} /> 
              <SessionSummaryCard session={session} />
              <LatestBlocksCard latestBlock={latestBlock} renderedBlocks={renderedBlocks} />
            </>
          )}
          <Footer />
        </VStack>
        <FireAnimation />
      </Center>
    </CurrencyProvider>
  );
}
