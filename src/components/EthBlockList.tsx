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
        {block.hash.substr(0, 10)}
      </td>
      <td>
        {block.gasUsed}
      </td>
      <td>
        {block.transactions.length}
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
        <th>#</th>
        <th>hash</th>
        <th>gas used</th>
        <th>transaction count</th>
        <th>burned</th>
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
