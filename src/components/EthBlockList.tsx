import { Table, Thead, Tr, Th, Tbody, Td } from '@chakra-ui/react';
import React from 'react';
import { BlockTransactionString } from 'web3-eth';

export interface BurnedBlockTransactionString extends BlockTransactionString {
  weiBurned: string
}

interface EthBlockItemProps {
  block: BurnedBlockTransactionString
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block } = props

  return (
    <Tr>
      <Td>
        {block.number}
      </Td>
      <Td>
        {block.timestamp}
      </Td>
      <Td>
        {block.transactions.length}
      </Td>
      <Td>
        {block.uncles.length}
      </Td>
      <Td>
        {(block.gasUsed / block.gasLimit * 100).toFixed(2)}%
      </Td>
      <Td>
        {block.gasLimit}
      </Td>
      <Td>
        {block.weiBurned}
      </Td>
    </Tr>
  )
}

export interface EthBlockListProps {
  blocks: BurnedBlockTransactionString[]
}

export function EthBlockList(props: EthBlockListProps) {
  const { blocks } = props

  return (
    <Table>
    <Thead>
      <Tr whiteSpace="nowrap">
        <Th>Block</Th>
        <Th>Age</Th>
        <Th>Txn</Th>
        <Th>Uncles</Th>
        <Th>Gas Used</Th>
        <Th>Gas Limit</Th>
        <Th>Burned Wei</Th>
      </Tr>
    </Thead>
    <Tbody>
      {blocks.map((block, idx) => (
        <EthBlockItem key={idx} block={block} />
      ))}
    </Tbody>
  </Table>
  )
}
