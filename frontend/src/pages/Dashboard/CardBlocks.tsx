import { Text, HStack, Icon, Box, Tbody, Thead, Tooltip, Tr, VStack, Heading, ListItem, UnorderedList, LightMode } from "@chakra-ui/react";
import { FaCubes } from 'react-icons/fa';
import { VscInfo } from "react-icons/vsc";
import { Card } from "../../atoms/Card";
import { FirePit } from "../../atoms/FirePit";
import { TablePlus, TdPlus, ThPlus } from "../../atoms/TablePlus";
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { BigNumberText } from "../../organisms/BigNumberText";
import { GasUsed, GasUsedPercent } from "../../organisms/GasUsed";
import { timeSince } from "../../utils/time";
import { BlockStats } from "../../libs/ethereum";
import { maxBlocksToRenderInTable } from "../../config";

function GasUsedInfo() {
  return (
    <Box>
      <LightMode>
        <Heading size="sm">Gas used is % of gas target</Heading>
        <UnorderedList mt={4}>
          <ListItem>100% == no change in base fee</ListItem>
          <ListItem>200% == 12.5% increase in base fee</ListItem>
          <ListItem>0% == 12.5% decrease in base fee</ListItem>
        </UnorderedList>
      </LightMode>
    </Box>
  );
}

function TxnInfo() {
  return (
    <Box>
      <LightMode>
        <Text>Total Transactions in this block (% type 2)</Text>
      </LightMode>
    </Box>
  );
}

function BlockItem({ block }: { block: BlockStats }) {
  const transactionPercentage = block.transactions === 0 ? 0 : (block.type2transactions / block.transactions * 100).toFixed(0);
  return (
    <Tr>
      <TdPlus>{block.number}</TdPlus>
      <TdPlus><VStack alignItems="flex-end"><HStack><BigNumberText number={block.burned} /><FirePit size="12px" /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.tips} /></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.baseFee} /></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.priorityFee} /></TdPlus>
      <TdPlus textAlign="right"><VStack alignItems="flex-end"><HStack><GasUsed gasUsed={block.gasUsed} /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><VStack alignItems="flex-end"><HStack><GasUsedPercent gasUsed={block.gasUsed} gasTarget={block.gasTarget} /></HStack></VStack></TdPlus>
      <TdPlus textAlign="right"><BigNumberText number={block.rewards} /></TdPlus>
      <TdPlus textAlign="right">{block.transactions} ({transactionPercentage}%)</TdPlus>
      <TdPlus textAlign="right">{timeSince(block.timestamp)}</TdPlus>
    </Tr>
  );
}

export function BlockList() {
  const { data: { blocks } } = useBlockExplorer();

  return (
    <Box position="relative" h="100%" flex={1} overflow="auto" whiteSpace="nowrap" ml="-10px" mr="-10px">
      <TablePlus>
        <Thead>
          <Tr>
            <ThPlus textAlign="left" width="0.1%">Block</ThPlus>
            <ThPlus>Burned</ThPlus>
            <ThPlus>Tips</ThPlus>
            <ThPlus>Base Fee</ThPlus>
            <ThPlus>Priority Fee</ThPlus>
            <ThPlus><VStack alignItems="flex-end"><HStack><Text>Gas Used</Text><Tooltip placement="top" label={<GasUsedInfo />}><Box><Icon as={VscInfo} fontSize={16} /></Box></Tooltip></HStack></VStack></ThPlus>
            <ThPlus>% Target</ThPlus>
            <ThPlus>Rewards</ThPlus>
            <ThPlus><VStack alignItems="flex-end"><HStack><Text>Txn</Text><Tooltip placement="top" label={<TxnInfo />}><Box><Icon as={VscInfo} fontSize={16} /></Box></Tooltip></HStack></VStack></ThPlus>
            <ThPlus>Age</ThPlus>
          </Tr>
        </Thead>
        <Tbody>
          {blocks.slice(0, maxBlocksToRenderInTable).map((block) => (
            <BlockItem
              key={block.number}
              block={block} />
          ))}
        </Tbody>
      </TablePlus>
    </Box>
  );
}

export function CardBlocks() {
  return (
    <Card
      title="Blocks"
      icon={FaCubes}
      flex={['auto', 'auto', 1]}
      h={[600, 600, "auto"]}
    >
      <BlockList />
    </Card>
  );
}
