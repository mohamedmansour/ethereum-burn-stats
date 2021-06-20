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
} from "@chakra-ui/react";
import { BlockWithTransactions } from "@ethersproject/abstract-provider";
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

interface BlockDetailState {
  block?: BlockWithTransactions;
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
      const blockNumber = parseInt(id);
      if (!eth || !id) return;
      const latestBlockNumber = await eth.getBlockNumber();
      dispatch({
        type: "UPDATE",
        block: await eth.getBlockWithTransactions(blockNumber),
        onBeforeRender: blockNumber > 0,
        onAfterRender: latestBlockNumber > blockNumber,
      });
    })();
  }, [eth, id]);

  const { block } = state;

  if (!block || !eth) {
    return <Loader>Loading transactions for block</Loader>;
  }

  const onBeforeRender = state.onBeforeRender ? (
    <Icon
      userSelect="none"
      as={VscChevronLeft}
      onClick={() => history.push(`/block/${parseInt(id) - 1}`)}
    />
  ) : undefined;

  const onAfterRender = state.onAfterRender ? (
    <Icon
      userSelect="none"
      as={VscChevronRight}
      onClick={() => history.push(`/block/${parseInt(id) + 1}`)}
    />
  ) : undefined;

  return (
    <VStack overflow="hidden" m="4" mt="0" align="flex-start" h="100%">
      <PageTitle
        title="Block"
        subtitle={"#" + id}
        beforeRender={onBeforeRender}
        afterRender={onAfterRender}
      />

      <Card overflow="auto" flex="1" w="100%">
        {block.transactions.length === 0 && <Text>No Transactions</Text>}
        {block.transactions.length !== 0 && (
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
              {block.transactions.map((t, idx) => (
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
    </VStack>
  );
}
