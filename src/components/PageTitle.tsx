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
  subtitle?: string;
  beforeRender?: JSX.Element;
  afterRender?: JSX.Element;
}

export const PageTitle = forwardRef<PageTitleProps, "div">(
    (props: PageTitleProps, ref: React.ForwardedRef<any>) => {
  const {
    title,
    subtitle,
    beforeRender,
    afterRender,
    ...rest
  } = props

  const styles = {
    title: title,
    subtitle: subtitle,
    beforeRender: beforeRender,
    afterRender: afterRender
  }

  return (
    <HStack ref={ref} {...rest}>
      <Heading size="md">{styles.title}</Heading>
      {styles.beforeRender && styles.beforeRender}
      {styles.subtitle && (<Text>{styles.subtitle}</Text>)}
      {styles.afterRender && styles.afterRender}
    </HStack>
  );
});
