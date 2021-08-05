import { Text, HStack, Icon } from "@chakra-ui/react";
import { FaGasPump } from 'react-icons/fa';
import { BlockExplorerDetails } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { layoutConfig } from "../../layoutConfig";
import { useEffect, useState } from "react";
import { useEthereum } from "../../contexts/EthereumContext";
import { FirePit } from "../../atoms/FirePit";

export function CardLatestStats({ details }: { details: BlockExplorerDetails; }) {
  const { eth } = useEthereum();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!eth) {
      return;
    }
    
    const onClient = (count: number) => setCount(count);

    eth.on('client', onClient)
    return () => {
      eth.off('client', onClient)
    }
  }, [eth]);
  return (
    <Card gridGap={layoutConfig.miniGap}>
      <HStack pr={10}>
        <Icon as={FaGasPump} />
        <Text fontSize="md" fontWeight="bold">
          Latest Stats
        </Text>
      </HStack>
      <HStack>
        <Text flex={1}>Base Fee</Text>
        <BigNumberText number={details.currentBaseFee} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <HStack flex={1}><Text>Watching the Burn</Text> <FirePit size="12px" /></HStack>
        <Text>{count} users</Text>
      </HStack>
    </Card>
  );
}
