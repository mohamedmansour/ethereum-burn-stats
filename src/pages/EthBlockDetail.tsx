import {
  Table,
  Text,
  Tbody,
  Thead,
  Tr,
  Th,
  Td,
  Link,
  VStack,
  Icon,
  Button,
  Grid,
  Heading,
  Tab,
  TabList,
  Tabs,
  TabPanels,
  TabPanel,
  HStack,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Flex,
  GridItem,
} from "@chakra-ui/react";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { utils } from "ethers";
import { useReducer, useEffect } from "react";
import { VscChevronLeft, VscChevronRight } from "react-icons/vsc";
import { useParams, Link as ReactLink, useHistory } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";
import { Card } from "../components/Card";
import {
  BlockExplorerApi,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";
import { FirePit } from "../components/FirePit";
import { BigNumberText } from "../components/BigNumberFormat";

interface BlockDetailState {
  block?: BurnedBlockTransaction;
  transactions?: Array<TransactionResponse>;
  onBeforeRender?: boolean;
  onAfterRender?: boolean;
}

interface UpdateAction extends BlockDetailState {
  type: "UPDATE";
}

type BlockDetailAction = UpdateAction;

const blockDetailReducer = (
  state: BlockDetailState,
  action: BlockDetailAction
): BlockDetailState => {
  switch (action.type) {
    case "UPDATE":
      return action;
  }
};

export function EthBlockDetail() {
  let history = useHistory();
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [state, dispatch] = useReducer(blockDetailReducer, {});

  useEffect(() => {
    (async () => {
      if (!eth || !id) return;
      const blockNumber = parseInt(id);
      const latestBlockNumber = await eth.getBlockNumber();
      const blockTransactions = await eth.getBlockWithTransactions(blockNumber);
      const block = await BlockExplorerApi.fetchBlock(eth, blockNumber);
      
      dispatch({
        type: "UPDATE",
        block: block,
        transactions: blockTransactions.transactions,
        onBeforeRender: blockNumber > 0,
        onAfterRender: latestBlockNumber > blockNumber,
      });
    })();
  }, [eth, id]);

  const { block, transactions } = state;

  if (!block || !eth || !transactions) {
    return <Loader>loading transactions for block</Loader>;
  }

  const onBeforeRender = state.onBeforeRender ? (
    <Button
      colorScheme="whiteAlpha"
      variant="outline"
      size="sm"
      onClick={() => history.push(`/block/${parseInt(id) - 1}`)}
    >
      <Icon
        w="24px"
        h="24px"
        cursor="pointer"
        userSelect="none"
        as={VscChevronLeft}
      />
    </Button>
  ) : undefined;

  const onAfterRender = state.onAfterRender ? (
    <Button
      colorScheme="whiteAlpha"
      variant="outline"
      size="sm"
      onClick={() => history.push(`/block/${parseInt(id) + 1}`)}
    >
      <Icon
        w="24px"
        h="24px"
        cursor="pointer"
        userSelect="none"
        as={VscChevronRight}
      />
    </Button>
  ) : undefined;

  
  

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
          <HStack gridGap="4">
            <Text>Block {id}</Text>
            <HStack>
              {onBeforeRender}
              {onAfterRender}
            </HStack>
          </HStack>
        </BreadcrumbItem>
      </Breadcrumb>

      <Tabs variant="soft-rounded" colorScheme="whiteAlpha" mt={["4", "4", "6"]}>
        <TabList mb="4">
          <Tab>Overview</Tab>
          <Tab>Transactions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p="0">
            <Grid
              templateColumns={["repeat(2, 1fr)", "repeat(3, 1fr)"]}
              gridGap="4"
            >
              <GridItem colSpan={1}>
                <Card>
                  <VStack>
                    <Heading size="sm">Block Reward</Heading>
                    <BigNumberText number={block.rewards} />
                  </VStack>
                </Card>
              </GridItem>
              <GridItem colSpan={1}>
                <Card>
                  <VStack>
                    <Heading size="sm">Base Fee</Heading>
                    <BigNumberText number={block.basefee} />
                  </VStack>
                </Card>
              </GridItem>
              <GridItem colSpan={[2, 1]}>
                <Card>
                  <VStack>
                    <Heading size="sm">
                      <HStack>
                        <Text>Burned</Text>
                        <FirePit size="12px" />
                      </HStack>
                    </Heading>
                    <BigNumberText number={block.burned} />
                  </VStack>
                </Card>
              </GridItem>
            </Grid>
            <Card mt="4">
              <Heading size="sm">Info</Heading>
              <Grid templateColumns={["auto", "150px auto"]} gap={4} p="2">
                <Text color="brand.secondaryText">Timestamp:</Text>
                <Text>{block.timestamp}</Text>
                <Text color="brand.secondaryText">Mined by:</Text>
                <Text isTruncated color="brand.linkColor" position="relative">
                  <Link
                    to={`/account/${block.miner}`}
                    as={ReactLink}
                    overflow="hidden"
                  >
                    {block.miner}
                  </Link>
                </Text>
                <Text color="brand.secondaryText">Difficulty:</Text>
                <Text>{utils.commify(block.difficulty)}</Text>
                <Text color="brand.secondaryText">Gas used:</Text>
                <BigNumberText number={block.gasUsed} />
                <Text color="brand.secondaryText">Gas limit:</Text>
                <BigNumberText number={block.gasLimit} />
                <Text color="brand.secondaryText">Extra data:</Text>
                <Text wordBreak="break-all">{block.extraData}</Text>
              </Grid>
            </Card>
          </TabPanel>
          <TabPanel p="0">
            <Card overflowX="auto" overflowY="hidden">
              {transactions.length === 0 && <Text>No Transactions</Text>}
              {transactions.length !== 0 && (
                <Table w="100%" colorScheme="whiteAlpha">
                  <Thead>
                    <Tr whiteSpace="nowrap">
                      <Th color="brand.secondaryText">Confs</Th>
                      <Th color="brand.secondaryText">Tx</Th>
                      <Th color="brand.secondaryText">Value</Th>
                      <Th color="brand.secondaryText">Gas Price (wei)</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((t, idx) => (
                      <Tr key={idx}>
                        <Td width="10%">{t.confirmations}</Td>
                        <Td
                          width="100%"
                          position="relative"
                        >
                          <Link
                            color="brand.linkColor"
                            to={`/transaction/${t.hash}`}
                            as={ReactLink}
                            overflow="hidden"
                            isTruncated
                            position="absolute"
                            top="30%"
                            left="0"
                            right="0"
                          >
                            {t.hash}
                          </Link>
                        </Td>
                        <Td whiteSpace="nowrap" width="10%">
                          <BigNumberText number={t.value} />
                        </Td>
                        <Td width="10%">
                          <BigNumberText number={t.gasPrice} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              )}
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  );
}
