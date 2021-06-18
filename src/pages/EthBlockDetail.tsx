import { Box, Heading, Table, Text, Tbody, Thead, Tr, Th, Td, Link } from "@chakra-ui/react";
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";
import { Setting } from "../contexts/SettingsContext";
import { useSetting } from "../hooks/useSetting";
import { Link as ReactLink } from 'react-router-dom';

export function EthBlockDetail() {
  let { id } = useParams<{ id: string }>()
  const { eth } = useEthereum()
  const [block, setBlock] = useState<BlockWithTransactions>()
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei)

  useEffect(() => {
    if (!eth)
      return

    (async () => {
      setBlock(await eth.getBlockWithTransactions(parseInt(id)))
    })()
  }, [eth, id])


  if (!block) {
    return <Loader>Loading transactions for block</Loader>
  }

  return (
    <Box p="10" >
      <Heading>Block #{id}</Heading>
      {block.transactions.length === 0 && (
        <Text>No Transactions</Text>
      )}
      {block.transactions.length !== 0 && (
        <Table>
          <Thead>
            <Tr whiteSpace="nowrap">
              <Th>Confirmations</Th>
              <Th>Tx</Th>
              <Th>Value</Th>
              <Th>Gas Price</Th>
            </Tr>
          </Thead>
          <Tbody>
            {block.transactions.map((t, idx) => (
              <Tr whiteSpace="nowrap" key={idx}>
                <Td>{t.confirmations}</Td>
                <Td><Link color="blue" to={`/transaction/${t.hash}`} as={ReactLink}>{t.hash}</Link></Td>
                <Td>{utils.formatEther(t.value)} Ether</Td>
                <Td>{utils.formatUnits(t.gasPrice, formatBurnInGwei ? 'gwei' : 'wei')}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  )
}