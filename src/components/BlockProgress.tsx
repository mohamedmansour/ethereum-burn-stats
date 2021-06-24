import { forwardRef, HTMLChakraProps, Progress } from "@chakra-ui/react";

// Chakra didn't export it.
interface ProgressOptions {
  value?: number;
  min?: number;
  max?: number;
  hasStripe?: boolean;
  isAnimated?: boolean;
  isIndeterminate?: boolean;
}

export interface BlockProgressProps
  extends HTMLChakraProps<"header">,
    ProgressOptions {
}

export const BlockProgress = forwardRef<BlockProgressProps, "div">(
  (props: BlockProgressProps, ref: React.ForwardedRef<any>) => {
    return (
      <Progress
        size="xs"
        colorScheme="orange"
        bg="brand.background"
        isAnimated
        hasStripe={true}
        rounded="full"
        isIndeterminate
        {...props}
      />
    );
  }
);
