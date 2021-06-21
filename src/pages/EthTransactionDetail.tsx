import {
  Table,
  Tbody,
  Tr,
  Td,
  Link,
  Code,
  VStack,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Text,
} from "@chakra-ui/react";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { Link as ReactLink, useParams } from "react-router-dom";
import { Card } from "../components/Card";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";

export function EthTransactionDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [transaction, setTransaction] = useState<TransactionResponse>();

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setTransaction(await eth.getTransaction(id));
    })();
  }, [eth, id]);

  if (!transaction) {
    return <Loader>Loading transaction</Loader>;
  }

  return (
    <VStack overflow="hidden" m="8" mt="0" align="flex-start" h="100%">+
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Transaction {id} </Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Card overflow="auto" flex="1" w="100%">
        <Table colorScheme="whiteAlpha">
          <Tbody>
            <Tr>
              <Td color="brand.secondaryText">From</Td>
              <Td>
                <Link
                  color="brand.linkColor"
                  to={`/account/${transaction.from}`}
                  as={ReactLink}
                >
                  {transaction.from}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">To</Td>
              <Td>
                <Link
                  color="brand.linkColor"
                  to={`/account/${transaction.to}`}
                  as={ReactLink}
                >
                  {transaction.to}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Confirmations</Td>
              <Td>{transaction.confirmations}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Block Number</Td>
              <Td>
                <Link
                  color="brand.linkColor"
                  to={`/block/${transaction.blockNumber}`}
                  as={ReactLink}
                >
                  {transaction.blockNumber}
                </Link>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Gas Limit (Wei)</Td>
              <Td>{utils.formatUnits(transaction.gasLimit, "wei")}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Gas Price (Wei)</Td>
              <Td>{utils.formatUnits(transaction.gasPrice, "wei")}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Value (Wei)</Td>
              <Td>{utils.formatUnits(transaction.value, "wei")}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Data</Td>
              <Td>
                <Code w="50vw">{transaction.data}</Code>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">s</Td>
              <Td>{transaction.s}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">r</Td>
              <Td>{transaction.r}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">v</Td>
              <Td>{transaction.v}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Type</Td>
              <Td>{transaction.type}</Td>
            </Tr>
          </Tbody>
        </Table>
      </Card>
    </VStack>
  );
}
