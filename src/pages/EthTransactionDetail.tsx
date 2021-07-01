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
  Flex,
} from "@chakra-ui/react";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { useState } from "react";
import { useEffect } from "react";
import { Link as ReactLink, useParams } from "react-router-dom";
import { BigNumberText } from "../components/BigNumberFormat";
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
    <Flex flex="1" direction="column"
        pt={["4", "4", "0"]}
        pl={["4", "4", "8"]}
        pr={["4", "4", "8"]}
        pb={["8", "8", "12"]}>
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Transaction</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Card flex="1" w="100%" mt={["4", "4", "6"]}>
        <Table colorScheme="whiteAlpha">
          <Tbody>
            <Tr>
              <Td color="brand.secondaryText">Id:</Td>
              <Td>{id}</Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">From</Td>
              <Td isTruncated>
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
              <Td color="brand.secondaryText">Confs</Td>
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
              <Td color="brand.secondaryText">Gas Limit</Td>
              <Td><BigNumberText number={transaction.gasLimit} /></Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Gas Price</Td>
              <Td><BigNumberText number={transaction.gasPrice} /></Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Value</Td>
              <Td><BigNumberText number={transaction.value} /></Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">Data</Td>
              <Td>
                <Code w="50vw">{transaction.data}</Code>
              </Td>
            </Tr>
            <Tr>
              <Td color="brand.secondaryText">s</Td>
              <Td  wordBreak="break-all">{transaction.s}</Td>
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
    </Flex>
  );
}
