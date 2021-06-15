import { useWeb3 } from '../contexts/Web3Context';
import { useEffect, useState } from 'react';
import Web3 from 'web3';
import { BlockHeader } from 'web3-eth';
import { Subscription } from 'web3-core-subscriptions';
import { EthBlockList, BurnedBlockTransactionString } from '../components/EthBlockList';
import { Box, Heading, HStack, Text, VStack } from '@chakra-ui/react';

export function DashboardPage() {
  const { web3 } = useWeb3()
  const [totalBurned, setTotalBurned] = useState<string>()
  const [blocks, setBlocks] = useState<BurnedBlockTransactionString[]>()

  useEffect(() => {
    if (!web3)
      return

    const onNewBlockHeader = async (error: Error, blockHeader: BlockHeader) => {
      const block = await web3.eth.getBlock(blockHeader.number)
      if (!block)
        return
      
      const blockNumberInHex = web3.utils.toHex(blockHeader.number)
      const burned = await web3.debug.burned(blockNumberInHex, blockNumberInHex)
      if (burned !== '0x0') {
        setTotalBurned(total => {
          const burnedInBN = web3.utils.toBN(burned)
          const totalInHex = web3.utils.toWei(total || '0', 'ether')
          const totalInBN = web3.utils.toBN(totalInHex)
          if (total)
            return Web3.utils.fromWei(burnedInBN.add(totalInBN), 'ether')
          else
            return Web3.utils.fromWei(burned, 'ether')
        })
      }

      setBlocks(blocks => {
        if (!blocks)
          blocks = []
        
        return [{
          ...block,
          weiBurned: Web3.utils.fromWei(burned, 'wei')
        }, ...blocks]
      })
    }

    const prefetchBlockHeaders = async (blockHeaderCount: number) => {
      const latestBlockNumber = await web3.eth.getBlockNumber()

      if (latestBlockNumber) {
        const processedBlocks: BurnedBlockTransactionString[] = []
        for (var i = 0; i < blockHeaderCount; i++) {
          const blockNumber = latestBlockNumber - i
          const blockNumberInHex = web3.utils.toHex(blockNumber)
          const block = await web3.eth.getBlock(blockNumber)

          if (block) {
            const burned = await web3.debug.burned(blockNumberInHex, blockNumberInHex)
            processedBlocks.push({
              ...block,
              weiBurned: Web3.utils.fromWei(burned, 'wei')
            })
          }
        }

        setBlocks(processedBlocks)
      }
    }

    let newBlockHeadersSubscription: Subscription<BlockHeader>

    (async () => {
      setTotalBurned(Web3.utils.fromWei(await web3.debug.burned(), 'ether'))
      prefetchBlockHeaders(10)
      newBlockHeadersSubscription = web3.eth.subscribe('newBlockHeaders', onNewBlockHeader);
    })()

    return () => {newBlockHeadersSubscription && newBlockHeadersSubscription.unsubscribe()}
  }, [web3])

  return (
    <Box>
      <Heading>ETH Burn</Heading>
      <HStack>
        <Heading size="md">Total</Heading>
        {!totalBurned && (<Text>Loading total burned ...</Text>)}
        {totalBurned && (<Text>{totalBurned} ETH</Text>)}
      </HStack>
      <Box>
        <Heading size="md">Latest Blocks</Heading>
        {!blocks && (<Text>Loading blocks ...</Text>)}
        {blocks && (<EthBlockList blocks={blocks} />)}
      </Box>
    </Box>
  )
}