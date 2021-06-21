import { Button, forwardRef, HTMLChakraProps, Icon } from "@chakra-ui/react";
import { SiEthereum } from "react-icons/si";
import { useHistory } from "react-router-dom";
import { Setting, EthereumNetworkOptions } from "../config";
import { useSetting } from "../hooks/useSetting";

export const EthereumNetwork = forwardRef<HTMLChakraProps<"button">, "button">(
    (props: HTMLChakraProps<"button">, ref: React.ForwardedRef<any>) => {
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
      {...props}
    >
      {EthereumNetworkOptions[network].name}
    </Button>
  );
});
