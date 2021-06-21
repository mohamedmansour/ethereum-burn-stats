import { Center, VStack, Text } from '@chakra-ui/react';
import React from 'react';
import { FirePit } from './FirePit';

interface LoaderProps {
  children: React.ReactNode;
}

export function Loader(props: LoaderProps) {
  return (
    <Center h="100vh" color="brand.primaryText">
      <VStack>
        <FirePit sparkCount={10} size="50px"/>
        <Text>{props.children}</Text>
      </VStack>
    </Center>
  );
}