import { Button, Icon } from "@chakra-ui/react";
import { SiEthereum } from "react-icons/si";
import { useHistory } from "react-router-dom";
import { Setting } from "../config";
import { useSetting } from "../hooks/useSetting";

export function EthereumNetwork() {
  const history = useHistory()
  const network = useSetting<string>(Setting.network);

  return (
    <Button
      colorScheme="orange"
      variant="solid"
      size="xs"
      leftIcon={<Icon as={SiEthereum} />}
      title="Change network"
      onClick={() => history.push('/settings')}
    >
      {network}
    </Button>
  );
}
