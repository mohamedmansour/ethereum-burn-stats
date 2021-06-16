import { Table, Thead, Tr, Th, Tbody, Td, Link } from '@chakra-ui/react';
import { ethers, utils } from 'ethers'
import React from 'react';
import { Link as ReactLink } from 'react-router-dom';
import { Setting } from '../contexts/SettingsContext';
import { useSetting } from '../hooks/useSetting';
import { timeSince } from '../utils/time';
import { GasUsed } from '../components/GasUsed';

export interface BurnedBlockTransactionString extends ethers.providers.Block {
  weiBurned: string
  ethRewards: string
}

interface EthBlockItemProps {
  block: BurnedBlockTransactionString
  autoFormatBurn: boolean
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block, autoFormatBurn } = props
  const weiBurnedFormatted = block.weiBurned === '0' ? 0 : (autoFormatBurn ? parseFloat(utils.formatUnits(block.weiBurned, 'gwei')).toFixed(2) : utils.commify(block.weiBurned))

  return (
    <Tr>
      <Td>
        <Link color="blue" to={`/block/${block.number}`} as={ReactLink}>{block.number}</Link>
      </Td>
      <Td whiteSpace="nowrap">
        {timeSince(block.timestamp as number)}
      </Td>
      <Td>
        {block.transactions.length}
      </Td>
      <Td>
        <GasUsed gasUsed={block.gasUsed} gasLimit={block.gasLimit} />
      </Td>
      <Td>
        {block.gasLimit.toLocaleString()}
      </Td>
      <Td>
        {block.ethRewards}
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
          <Th>Gas Used</Th>
          <Th>Gas Limit</Th>
          <Th>Rewards (ETH)</Th>
          <Th>Burned {autoFormatBurn ? 'Gwei' : 'Wei'}</Th>
        </Tr>
      </Thead>
      <Tbody>
        {blocks.map((block, idx) => (
          <EthBlockItem key={idx} block={block} autoFormatBurn={autoFormatBurn || false} />
        ))}
      </Tbody>
    </Table>
  )
}
