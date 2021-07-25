import {
  Text,
  Tbody,
  Thead,
  Tr,
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
import { useState, useEffect } from "react";
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
import { BigNumberText } from "../components/BigNumberText";
import { layoutConfig } from "../layoutConfig";
import { TablePlus, ThPlus } from "../components/TablePlus";

interface BlockDetailState {
  block?: BurnedBlockTransaction;
  transactions?: Array<TransactionResponse>;
  onBeforeRender?: boolean;
  onAfterRender?: boolean;
}

export function EthBlockDetail() {
  let history = useHistory();
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [state, setState] = useState<BlockDetailState>();

  useEffect(() => {
    (async () => {
      if (!eth || !id) return;
      const blockNumber = parseInt(id);
      const latestBlockNumber = await eth.getBlockNumber();
      const blockTransactions = await eth.getBlockWithTransactions(blockNumber);
      const block = await BlockExplorerApi.fetchBlock(eth, blockNumber);

      setState({
        block: block,
        transactions: blockTransactions.transactions,
        onBeforeRender: blockNumber > 0,
        onAfterRender: latestBlockNumber > blockNumber,
      });
    })();
  }, [eth, id]);

  if (!state || !state.block || !state.transactions || !eth) {
    return <Loader>loading transactions for block</Loader>;
  }

  const { block, transactions } = state;

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
    <Flex flex="1" direction="column" m={layoutConfig.gap} gridGap={layoutConfig.gap}>
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

      <Tabs variant="soft-rounded" colorScheme="whiteAlpha" flex={1} display="flex" flexDirection="column">
        <TabList mb="4">
          <Tab color="gray">Overview</Tab>
          <Tab color="gray">Transactions</Tab>
        </TabList>
        <TabPanels height="100%" flex={1}>
          <TabPanel p="0" height="inherit">
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
                <Text isTruncated color="orange" position="relative">
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
                <Text wordBreak="break-all" title={'data: ' + block.extraData}>
                  {block.extraData}
                </Text>
              </Grid>
            </Card>
          </TabPanel>
          <TabPanel p="0" height="inherit">
            <Card position="relative" w="100%" h="100%" overflow="auto" >
              {transactions.length === 0 && <Text>No Transactions</Text>}
              {transactions.length !== 0 && (
                <TablePlus w="100%" colorScheme="whiteAlpha">
                  <Thead>
                    <Tr whiteSpace="nowrap">
                      <ThPlus>Confs</ThPlus>
                      <ThPlus>Tx</ThPlus>
                      <ThPlus>Value</ThPlus>
                      <ThPlus>Gas Price (wei)</ThPlus>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((t, idx) => (
                      <Tr key={idx}>
                        <Td w="10%">{t.confirmations}</Td>
                        <Td
                          w="100%"
                          position="relative"
                        >
                          <Link
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
                        <Td whiteSpace="nowrap" w="10%">
                          <BigNumberText number={t.value} />
                        </Td>
                        <Td w="10%">
                          <BigNumberText number={t.gasPrice} />
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </TablePlus>
              )}
            </Card>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Flex>
  );
}
