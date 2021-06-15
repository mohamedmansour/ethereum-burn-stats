import { Center, VStack, Text, Image } from '@chakra-ui/react';
import React from 'react';

interface LoaderProps {
  children: React.ReactNode;
}

export function Loader(props: LoaderProps) {
  return (
    <Center h="100vh" color="black">
      <VStack>
        <Image src="/logo_64.png" w="64px" h="64px" />
        <Text>{props.children}</Text>
      </VStack>
    </Center>
  );
}