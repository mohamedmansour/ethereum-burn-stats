import { Text, HStack, Icon, Box, Tbody, Thead, Tooltip, Tr, VStack, Heading, ListItem, UnorderedList, LightMode } from "@chakra-ui/react";
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
import React from "react";
import { layoutConfig } from "../../layoutConfig";

function TooltipGasUsedInfo() {
  return (
    <Box>
      <LightMode>
        <Heading size="xs">Gas used is % of gas target</Heading>
        <UnorderedList mt={4} spacing={2}>
          <ListItem>100% == no change in base fee</ListItem>
          <ListItem>200% == 12.5% increase in base fee</ListItem>
          <ListItem>0% == 12.5% decrease in base fee</ListItem>
        </UnorderedList>
      </LightMode>
    </Box>
  );
}

function TooltipRewardsInfo() {
  return (
    <Box>
      <LightMode>
	      <Text>Rewards is newly minted ethereum: block reward + uncle rewards + uncle inclusion rewards</Text>
      </LightMode>
    </Box>
  );
}

function TooltipTxnInfo() {
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

function ThPlusTooltip({ children, tooltip }: { children: React.ReactNode, tooltip: React.ReactNode }) {
  return <ThPlus><VStack alignItems="flex-end"><HStack><Text>{children}</Text><Tooltip placement="top" label={tooltip}><Box><Icon as={VscInfo} fontSize={16} /></Box></Tooltip></HStack></VStack></ThPlus>
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
            <ThPlusTooltip tooltip={<TooltipGasUsedInfo />}>Gas Used</ThPlusTooltip>
            <ThPlus>% Target</ThPlus>
            <ThPlusTooltip tooltip={<TooltipRewardsInfo />}>Rewards</ThPlusTooltip>
            <ThPlusTooltip tooltip={<TooltipTxnInfo />}>Txn</ThPlusTooltip>
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
      flex={layoutConfig.flexStretch}
      h={{ base: 400, md: "auto" }}
    >
      <BlockList />
    </Card>
  );
}
