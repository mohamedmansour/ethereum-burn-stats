import React from 'react';
import { BlockTransactionString } from 'web3-eth';

export interface BurnedBlockTransactionString extends BlockTransactionString {
  gweiBurned: string
}

interface EthBlockItemProps {
  block: BurnedBlockTransactionString
}

function EthBlockItem(props: EthBlockItemProps) {
  const { block } = props

  return (
    <tr>
      <td>
        {block.number}
      </td>
      <td>
        {block.timestamp}
      </td>
      <td>
        {block.transactions.length}
      </td>
      <td>
        {block.uncles.length}
      </td>
      <td>
        {(block.gasUsed / block.gasLimit * 100).toFixed(2)}%
      </td>
      <td>
        {block.gasLimit}
      </td>
      <td>
        {block.gweiBurned}
      </td>
    </tr>
  )
}

export interface EthBlockListProps {
  blocks: BurnedBlockTransactionString[]
}

export function EthBlockList(props: EthBlockListProps) {
  const { blocks } = props

  return (
    
    <table>
    <thead>
      <tr>
        <th>Block</th>
        <th>Age</th>
        <th>Txn</th>
        <th>Uncles</th>
        <th>Gas Used</th>
        <th>Gas Limit</th>
        <th>Burned</th>
      </tr>
    </thead>
    <tbody>
      {blocks.map((block, idx) => (
        <EthBlockItem key={idx} block={block} />
      ))}
    </tbody>
  </table>
  )
}
