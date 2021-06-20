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
} from "@chakra-ui/react";
import { TransactionResponse } from "@ethersproject/abstract-provider";
import { utils } from "ethers";
import { useReducer, useEffect } from "react";
import { VscChevronLeft, VscChevronRight } from "react-icons/vsc";
import { useParams, Link as ReactLink, useHistory } from "react-router-dom";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";
import { Setting } from "../contexts/SettingsContext";
import { useSetting } from "../hooks/useSetting";
import { Card } from "../components/Card";
import { PageTitle } from "../components/PageTitle";
import {
  BlockExplorerApi,
  BurnedBlockTransaction,
} from "../contexts/BlockExplorerContext";

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
  const formatBurnInGwei = useSetting<boolean>(Setting.formatBurnInGwei);
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
    return <Loader>Loading transactions for block</Loader>;
  }

  const onBeforeRender = state.onBeforeRender ? (
    <Button colorScheme="blackAlpha" variant="ghost">
      <Icon
        w="24px"
        h="24px"
        cursor="pointer"
        userSelect="none"
        as={VscChevronLeft}
        onClick={() => history.push(`/block/${parseInt(id) - 1}`)}
      />
    </Button>
  ) : undefined;

  const onAfterRender = state.onAfterRender ? (
    <Button colorScheme="blackAlpha" variant="ghost">
      <Icon
        w="24px"
        h="24px"
        cursor="pointer"
        userSelect="none"
        as={VscChevronRight}
        onClick={() => history.push(`/block/${parseInt(id) + 1}`)}
      />
    </Button>
  ) : undefined;

  const infoCardStyle = {
    h: '100%',
    minW: '200px'
  }

  return (
    <VStack m="4" mt="0" pt="1" pl="1" align="flex-start" h="100%">
      <PageTitle
        title="Block"
        subtitle={"#" + id}
        beforeRender={onBeforeRender}
        afterRender={onAfterRender}
      />
      <Tabs variant="soft-rounded" pl="4">
        <TabList mb="4">
          <Tab>Overview</Tab>
          <Tab>Transactions</Tab>
        </TabList>
        <TabPanels>
          <TabPanel p="0">
            <HStack h="100%">
              <Card {...infoCardStyle}>
                <VStack>
                  <Heading size="sm">Block Reward</Heading>
                  <Text>{block.ethRewards} ETH</Text>
                </VStack>
              </Card>
              <Card {...infoCardStyle}>
                <VStack>
                  <Heading size="sm">Base Fee</Heading>
                  <Text>{utils.commify(block.weiBaseFee)}</Text>
                </VStack>
              </Card>
              <Card {...infoCardStyle}>
                <VStack>
                  <Heading size="sm">Burned</Heading>
                  <Text>{utils.commify(block.weiBurned)}</Text>
                </VStack>
              </Card>
            </HStack>
            <Card mt="4">
              <Heading size="sm">Info</Heading>
              <Grid templateColumns="repeat(2, 1fr)" gap={4} p="2">
                <Text size="sm">Timestamp:</Text>
                <Text>{block.timestamp}</Text>
                <Text>Mined by:</Text>
                <Text>{block.miner}</Text>
                <Text>Burned:</Text>
                <Text>{utils.commify(block.weiBurned)}</Text>
                <Text>Difficulty:</Text>
                <Text>{utils.commify(block.difficulty)}</Text>
                <Text>Gas used:</Text>
                <Text>{utils.commify(utils.formatUnits(block.gasUsed, 'wei'))}</Text>
                <Text>Gas limit:</Text>
                <Text>{utils.commify(utils.formatUnits(block.gasLimit, 'wei'))}</Text>
                <Text>Extra data:</Text>
                <Text>{block.extraData}</Text>
              </Grid>
            </Card>
          </TabPanel>
          <TabPanel p="0">
            <Card>
              {transactions.length === 0 && <Text>No Transactions</Text>}
              {transactions.length !== 0 && (
                <Table w="100%">
                  <Thead>
                    <Tr whiteSpace="nowrap">
                      <Th>Confirmations</Th>
                      <Th>Tx</Th>
                      <Th>Value</Th>
                      <Th>Gas Price</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {transactions.map((t, idx) => (
                      <Tr whiteSpace="nowrap" key={idx}>
                        <Td>{t.confirmations}</Td>
                        <Td>
                          <Link
                            color="blue"
                            to={`/transaction/${t.hash}`}
                            as={ReactLink}
                          >
                            {t.hash}
                          </Link>
                        </Td>
                        <Td>{utils.formatEther(t.value)} Ether</Td>
                        <Td>
                          {utils.formatUnits(
                            t.gasPrice,
                            formatBurnInGwei ? "gwei" : "wei"
                          )}
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
    </VStack>
  );
}
