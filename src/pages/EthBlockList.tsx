import { Table, Thead, Tr, Th, Tbody, Td, Link } from '@chakra-ui/react';
import { utils } from 'ethers'
import { Link as ReactLink } from 'react-router-dom';
import { Setting } from '../contexts/SettingsContext';
import { useSetting } from '../hooks/useSetting';
import { timeSince } from '../utils/time';
import { GasUsed } from '../components/GasUsed';
import { formatWei } from '../utils/wei';
import { useBlockExplorer, BurnedBlockTransaction } from '../contexts/BlockExplorerContext';
import { Loader } from '../components/Loader';
import { BlockProgress } from '../components/BlockProgress';
import { Card } from '../components/Card';

const responsiveColumn = { display: ['none', 'none', 'table-cell'] }

interface EthBlockItemProps {
  block: BurnedBlockTransaction
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


export function EthBlockList() {
  const { details, blocks } = useBlockExplorer()
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei)
  const formatBaseFeeInGwei = useSetting<boolean>(Setting.formatBaseFeeInGwei)

  if (!details)
    return <Loader>Loading block details ...</Loader>

  if (!blocks)
    return <Loader>Loading blocks ...</Loader>

  const latestBlock = blocks[0]
  return (
    <Card m={4} mt={0} flex="1" overflow="auto">
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
          <Tr whiteSpace="nowrap">
            <Td>
              {details.currentBlock + 1}
            </Td>
            <Td colSpan={7}><BlockProgress totalSecondsPerBlock={30} block={latestBlock} /></Td>
          </Tr>
          {blocks.map((block, idx) => (
            <EthBlockItem key={idx} block={block} formatBurnInGwei={formatBurnInGwei} formatBaseFeeInGwei={formatBaseFeeInGwei} />
          ))}
        </Tbody>
      </Table>
    </Card>
  )
}
