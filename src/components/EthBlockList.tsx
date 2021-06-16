import { Table, Thead, Tr, Th, Tbody, Td } from '@chakra-ui/react';
import React from 'react';
import { BlockTransactionString } from 'web3-eth';
import { Setting } from '../contexts/SettingsContext';
import { useSetting } from '../hooks/useSetting';
import { timeSince } from '../utils/time';
import { GasUsed } from './GasUsed';

export interface BurnedBlockTransactionString extends BlockTransactionString {
  weiBurned: string
}

interface EthBlockItemProps {
  block: BurnedBlockTransactionString
  autoFormatBurn: boolean
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block, autoFormatBurn } = props
  const weiBurned = parseInt(block.weiBurned)
  const weiBurnedFormatted = weiBurned === 0 ? 0 : (autoFormatBurn ? (weiBurned / 1000000000).toFixed(2) : weiBurned.toLocaleString())

  return (
    <Tr>
      <Td>
        {block.number}
      </Td>
      <Td whiteSpace="nowrap">
        {timeSince(block.timestamp as number)}
      </Td>
      <Td>
        {block.transactions.length}
      </Td>
      <Td>
        {block.uncles.length}
      </Td>
      <Td>
        <GasUsed gasUsed={block.gasUsed}  gasLimit={block.gasLimit} />
      </Td>
      <Td>
        {block.gasLimit.toLocaleString()}
      </Td>
      <Td>
        {weiBurnedFormatted}
      </Td>
    </Tr>
  )
}

export interface EthBlockListProps {
  blocks: BurnedBlockTransactionString[]
}

export function EthBlockList(props: EthBlockListProps) {
  const { blocks } = props
  const autoFormatBurn = useSetting<boolean>(Setting.autoFormatBurn)

  return (
    <Table >
    <Thead>
      <Tr whiteSpace="nowrap">
        <Th>Block</Th>
        <Th>Age</Th>
        <Th>Txn</Th>
        <Th>Uncles</Th>
        <Th>Gas Used</Th>
        <Th>Gas Limit</Th>
        <Th>Burned {autoFormatBurn ? 'Gwei' : 'Wei'}</Th>
      </Tr>
    </Thead>
    <Tbody>
      {blocks.map((block, idx) => (
        <EthBlockItem key={idx} block={block} autoFormatBurn={autoFormatBurn || false}/>
      ))}
    </Tbody>
  </Table>
  )
}
