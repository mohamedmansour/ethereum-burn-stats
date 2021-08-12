import { Text, HStack } from "@chakra-ui/react";
import { useEffect, useState } from "react";
import { FaGlasses } from 'react-icons/fa';
import { useBlockExplorer } from "../../contexts/BlockExplorerContext";
import { Card } from "../../atoms/Card";
import { BigNumberText } from "../../organisms/BigNumberText";
import { FirePit } from "../../atoms/FirePit";

export function CardLatestStats() {
  const {data: {details}} = useBlockExplorer();
  const [count, setCount] = useState<number | undefined>(details.clients);

  useEffect(() => {
    setCount(details.clients);
  }, [details.clients]);

  return (
    <Card 
        title="Latest Stats"
        icon={FaGlasses}>
      <HStack>
        <Text flex={1}>Base Fee</Text>
        <BigNumberText number={details.currentBaseFee} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <Text flex={1}>Priority Fee</Text>
        <BigNumberText number={details.currentPriorityFee} fontSize={16} textAlign="right" />
      </HStack>
      <HStack>
        <HStack flex={1}><Text>Watching the Burn</Text> <FirePit size="12px" /></HStack>
        {count === undefined && <Text>calculating ...</Text>}
        {count !== undefined && <Text>{count} users</Text>}
      </HStack>
    </Card>
  );
}
