import { Text, HStack, Icon, Box, Link, Tbody, Thead, Tooltip, Tr, VStack, Heading, ListItem, UnorderedList } from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { FaCubes } from 'react-icons/fa';
import { VscInfo } from "react-icons/vsc";
import { Card } from "../../atoms/Card";
import { FirePit } from "../../atoms/FirePit";
import { TablePlus, TdPlus, ThPlus } from "../../atoms/TablePlus";
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { BigNumberText } from "../../organisms/BigNumberText";
import { GasTarget, GasUsed, GasUsedPercent } from "../../organisms/GasUsed";
import { timeSince } from "../../utils/time";
import { BlockStats } from "../../libs/ethereum";

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
  );
}

function BlockItem({ activated, block }: { activated: boolean, block: BlockStats }) {
  return (
    <Tr>
      <TdPlus>
        <Link
          to={`/block/${block.number}`}
          as={ReactLink}
        >
          {block.number}
        </Link>
      </TdPlus>
      <TdPlus><VStack alignItems="flex-end"><HStack><BigNumberText number={block.burned} /><FirePit size="12px" /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.tips} /></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.baseFee} /></TdPlus>
      <TdPlus textAlign="right"><VStack alignItems="flex-end"><HStack><GasTarget gasTarget={block.gasTarget} /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><VStack alignItems="flex-end"><HStack><GasUsed gasUsed={block.gasUsed} /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><VStack alignItems="flex-end"><HStack><GasUsedPercent gasUsed={block.gasUsed} gasTarget={block.gasTarget} /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.rewards} /></TdPlus>
      <TdPlus textAlign="right">{block.transactions}</TdPlus>
      <TdPlus textAlign="right">{timeSince(block.timestamp)}</TdPlus>
    </Tr>
  );
}

export function BlockList({ activated }: { activated: boolean; }) {
  const { details, blocks } = useBlockExplorer();
  if (!details || !blocks) {
    return null;
  }

  return (
    <Box position="relative" h="100%" flex={1} overflow="auto" whiteSpace="nowrap" ml="-10px" mr="-10px">
      <TablePlus colorScheme="whiteAlpha">
        <Thead>
          <Tr>
            <ThPlus textAlign="left" width="0.1%">Block</ThPlus>
            <ThPlus>Burned</ThPlus>
            <ThPlus>Tips</ThPlus>
            <ThPlus>Base Fee</ThPlus>
            <ThPlus>Gas Target</ThPlus>
            <ThPlus><VStack alignItems="flex-end"><HStack><Text>Gas Used</Text><Tooltip placement="top" label={<GasUsedInfo />}><Box><Icon as={VscInfo} fontSize={16} /></Box></Tooltip></HStack></VStack></ThPlus>
            <ThPlus>% Target</ThPlus>
            <ThPlus>Rewards</ThPlus>
            <ThPlus>Txn</ThPlus>
            <ThPlus>Age</ThPlus>
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            <TdPlus textAlign="left">{details.currentBlock + 1}</TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
            <TdPlus m={2}><Box bg="#2a2a2a" h="20px"></Box></TdPlus>
          </Tr>
          {blocks.map((block) => (
            <BlockItem
              key={block.number}
              block={block}
              activated={activated} />
          ))}
        </Tbody>
      </TablePlus>
    </Box>
  );
}

export function CardBlocks({ activated }: { activated: boolean; }) {
  return (
    <Card
      title="Blocks"
      icon={FaCubes}
      flex={['auto', 'auto', 1]}
      h={[600, 600, "auto"]}
    >
      <BlockList activated={activated} />
    </Card>
  );
}
