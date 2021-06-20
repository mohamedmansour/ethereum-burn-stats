import { Flex, FlexOptions, forwardRef, HTMLChakraProps } from "@chakra-ui/react";
import React from "react";

interface CardProps extends HTMLChakraProps<"div">, FlexOptions  {
}

export const Card = forwardRef<CardProps, 'div'>((props: CardProps, ref: React.ForwardedRef<any>) => {
   return (
     <Flex direction="column" px="4" py="5" rounded="md" shadow="lg" bg="brand.card" ref={ref} {...props}>
       {props.children}
    </Flex>
   )
})