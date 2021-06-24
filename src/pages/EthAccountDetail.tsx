import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, Grid, GridItem, Heading, Text, VStack } from "@chakra-ui/react";
import { utils } from "ethers";
import { useState } from "react";
import { useEffect } from "react";
import { useParams, Link as ReactLink } from "react-router-dom";
import { Card } from "../components/Card";
import { Loader } from "../components/Loader";
import { useEthereum } from "../contexts/EthereumContext";

export function EthAccountDetail() {
  let { id } = useParams<{ id: string }>();
  const { eth } = useEthereum();
  const [balance, setBalance] = useState<string>();

  useEffect(() => {
    if (!eth) return;

    (async () => {
      setBalance(utils.formatEther(await eth.getBalance(id)));
    })();
  }, [eth, id]);

  if (!balance === undefined) {
    return <Loader>Loading balance...</Loader>;
  }

  return (
    <VStack align="flex-start" h="100%">
      <Breadcrumb>
        <BreadcrumbItem fontSize="lg" fontWeight="bold">
          <BreadcrumbLink as={ReactLink} to="/blocks">
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem isCurrentPage>
          <Text>Account</Text>
        </BreadcrumbItem>
      </Breadcrumb>
      <Grid
        templateColumns="repeat(2, 1fr)"
        gridGap="4"
          >
          <GridItem colSpan={1}>
            <Card>
              <VStack>
                <Heading size="sm">Address</Heading>
                <Text>{id}</Text>
              </VStack>
            </Card>
          </GridItem>
          <GridItem colSpan={1}>
            <Card>
              <VStack>
                <Heading size="sm">Balance</Heading>
                <Text>{balance} ETH</Text>
              </VStack>
            </Card>
          </GridItem>
        </Grid>
    </VStack>
  );
}
