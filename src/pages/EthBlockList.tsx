import { Table, Thead, Tr, Th, Tbody, Td, Link } from '@chakra-ui/react';
import { ethers, utils } from 'ethers'
import React from 'react';
import { Link as ReactLink } from 'react-router-dom';
import { Setting } from '../contexts/SettingsContext';
import { useSetting } from '../hooks/useSetting';
import { timeSince } from '../utils/time';
import { GasUsed } from '../components/GasUsed';
import { formatWei } from '../utils/wei';

const responsiveColumn = { display: ['none', 'none', 'block'] }

export interface BurnedBlockTransactionString extends ethers.providers.Block {
  weiBurned: string
  ethRewards: string
  weiBaseFee: string
}

interface EthBlockItemProps {
  block: BurnedBlockTransactionString
  formatBurnInGwei: boolean
  formatBaseFeeInGwei: boolean
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block, formatBurnInGwei, formatBaseFeeInGwei } = props
  const weiBurnedFormatted = formatWei(block.weiBurned, formatBurnInGwei)
  const weiBaseFeeFormatted = formatWei(block.weiBaseFee, formatBaseFeeInGwei)

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
      <Td {...responsiveColumn}>
        {utils.commify(block.gasLimit.toNumber())}
      </Td>
      <Td>
        {block.ethRewards}
      </Td>
      <Td title={`${utils.commify(block.weiBaseFee)} wei`}>
        {weiBaseFeeFormatted}
      </Td>
      <Td title={`${utils.commify(block.weiBurned)} wei`}>
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
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei)
  const formatBaseFeeInGwei = useSetting<boolean>(Setting.formatBaseFeeInGwei)

  return (
    <Table>
      <Thead>
        <Tr whiteSpace="nowrap">
          <Th>Block</Th>
          <Th>Age</Th>
          <Th>Txn</Th>
          <Th>Gas Used</Th>
          <Th {...responsiveColumn}>Gas Limit</Th>
          <Th>Rewards (ETH)</Th>
          <Th>Base Fee ({formatBaseFeeInGwei ? 'Gwei' : 'Wei'})</Th>
          <Th>Burned ({formatBurnInGwei ? 'Gwei' : 'Wei'})</Th>
        </Tr>
      </Thead>
      <Tbody>
        {blocks.map((block, idx) => (
          <EthBlockItem key={idx} block={block} formatBurnInGwei={formatBurnInGwei} formatBaseFeeInGwei={formatBaseFeeInGwei} />
        ))}
      </Tbody>
    </Table>
  )
}
