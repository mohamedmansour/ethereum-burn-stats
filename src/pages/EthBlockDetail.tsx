import { Box, Heading, Table, Text, Tbody, Thead, Tr, Th, Td } from "@chakra-ui/react";
import { BlockWithTransactions } from '@ethersproject/abstract-provider';
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";
import { Setting } from "../contexts/SettingsContext";
import { useSetting } from "../hooks/useSetting";

export function EthBlockDetail() {
  let { id } = useParams<{ id: string }>()
  const { eth } = useEthereum()
  const [block, setBlock] = useState<BlockWithTransactions>()
  const autoFormatBurn = useSetting<boolean>(Setting.autoFormatBurn)

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
              <Th>From</Th>
              <Th>To</Th>
              <Th>Value</Th>
              <Th>Gas Price</Th>
            </Tr>
          </Thead>
          <Tbody>
            {block.transactions.map((t, idx) => (
              <Tr whiteSpace="nowrap" key={idx}>
                <Td>{t.confirmations}</Td>
                <Td>{t.from}</Td>
                <Td>{t.to}</Td>
                <Td>{utils.formatEther(t.value)} Ether</Td>
                <Td>{utils.formatUnits(t.gasPrice, autoFormatBurn ? 'gwei' : 'wei')}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </Box>
  )
}