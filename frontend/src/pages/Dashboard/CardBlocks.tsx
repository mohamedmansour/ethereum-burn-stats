import { Text, HStack, Icon, Box, Link, Tbody, Td, Thead, Tooltip, Tr, VStack, Heading, ListItem, UnorderedList } from "@chakra-ui/react";
import { Link as ReactLink } from "react-router-dom";
import { FaCubes } from 'react-icons/fa';
import { VscInfo } from "react-icons/vsc";
import { BlockProgress } from "../../atoms/BlockProgress";
import { Card } from "../../atoms/Card";
import { FirePit } from "../../atoms/FirePit";
import { TablePlus, ThPlus } from "../../atoms/TablePlus";
import { BurnedBlockTransaction, useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { BigNumberText } from "../../organisms/BigNumberText";
import { GasTarget, GasUsed, GasUsedPercent } from "../../organisms/GasUsed";
import { Loader } from "../../organisms/Loader";
import { timeSince } from "../../utils/time";

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

function BlockItem({ activated, block }: { activated: boolean, block: BurnedBlockTransaction }) {
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
      <Td><VStack alignItems="flex-end"><HStack><BigNumberText number={block.burned} /><FirePit size="12px" /></HStack></VStack></Td>
      <Td textAlign="right"><BigNumberText number={block.basefee} /></Td>
      <Td textAlign="right"><GasTarget gasUsed={block.gasUsed} gasLimit={block.gasLimit} activated={activated} /></Td>
      <Td textAlign="right"><GasUsed gasUsed={block.gasUsed} gasLimit={block.gasLimit} activated={activated} /></Td>
      <Td textAlign="right"><GasUsedPercent gasUsed={block.gasUsed} gasLimit={block.gasLimit} activated={activated} /></Td>
      <Td textAlign="right"><BigNumberText number={block.rewards} /></Td>
      <Td textAlign="right">{block.transactions.length}</Td>
      <Td textAlign="right">{timeSince(block.timestamp as number)}</Td>
    </Tr>
  );
}

export function BlockList({ activated }: { activated: boolean; }) {
  const { details, blocks } = useBlockExplorer();

  if (!details)
    return <Loader>loading block details ...</Loader>;

  if (!blocks)
    return <Loader>loading blocks ...</Loader>;

  return (
    <Box position="relative" w="100%" h="100%" flex={1} overflow="auto" whiteSpace="nowrap">
      <TablePlus colorScheme="whiteAlpha">
        <Thead>
          <Tr>
            <ThPlus textAlign="left" width="0.1%">Block</ThPlus>
            <ThPlus>Burned</ThPlus>
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
            <Td textAlign="left">{details.currentBlock + 1}</Td>
            <Td colSpan={8}>
              <BlockProgress />
            </Td>
          </Tr>
          {blocks.map((block, idx) => (
            <BlockItem
              key={idx}
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
      <BlockList activated={activated} />
    </Card>
  );
}
