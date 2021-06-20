import {
  Text,
  forwardRef,
  Heading,
  HStack,
  HTMLChakraProps,
} from "@chakra-ui/react";
import React from "react";

interface PageTitleProps extends HTMLChakraProps<"header"> {
  title: string;
  subtitle: string;
}

export const PageTitle = forwardRef<PageTitleProps, "div">(
  (props: PageTitleProps, ref: React.ForwardedRef<any>) => {
    return (
      <HStack ref={ref} {...props}>
        <Heading size="md">{props.title}</Heading>
        <Text>{props.subtitle}</Text>
      </HStack>
    );
  }
);
