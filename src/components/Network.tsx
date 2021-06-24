import { Button, forwardRef, HTMLChakraProps, Icon } from "@chakra-ui/react";
import { SiEthereum } from "react-icons/si";
import { useHistory } from "react-router-dom";
import { Setting, EthereumNetwork } from "../config";
import { useSetting } from "../hooks/useSetting";

export const EthereumNetworkBadge = forwardRef<HTMLChakraProps<"button">, "button">(
    (props: HTMLChakraProps<"button">, ref: React.ForwardedRef<any>) => {
  const history = useHistory()
  const network = useSetting<EthereumNetwork>(Setting.network);
  return (
    <Button
      colorScheme="orange"
      variant="solid"
      size="xs"
      leftIcon={<Icon as={SiEthereum} />}
      title="Change network"
      onClick={() => history.push('/settings')}
      {...props}
    >
      {network.name}
    </Button>
  );
});
