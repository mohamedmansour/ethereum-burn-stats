package hub

import (
	"encoding/json"
	"fmt"
	"math"
	"math/big"
	"net/http"
	"reflect"
	"sort"
	"strconv"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/mohamedmansour/ethereum-burn-stats/daemon/sql"
)

//var log = logrus.StandardLogger()

type statsMap struct {
	mu sync.Mutex
	v  map[uint64]sql.BlockStats
}

type totalsMap struct {
	mu sync.Mutex
	v  map[uint64]Totals
}

type Syncing struct {
	CurrentBlock string `json:"currentBlock"`
	HighestBlock string `json:"highestBlock"`
}

type Stats struct {
	handlers map[string]func(c *Client, message jsonrpcMessage) (json.RawMessage, error)

	rpcClient    *RPCClient
	db           *sql.Database
	latestBlock  *LatestBlock
	latestBlocks *LatestBlocks

	byzantiumBlock      uint64
	constantinopleBlock uint64
	londonBlock         uint64

	ethSyncing *Syncing

	statsByBlock  statsMap
	totalsByBlock totalsMap
	TotalsByTime  totalsMap

	// Used to perform the transaction receipt fetching within a worker
	transactionReceiptWorker *TransactionReceiptWorker
}

func (s *Stats) initialize(
	gethEndpointHTTP string,
	dbPath string,
	ropsten bool,
	workerCount int,
) error {
	var err error
	s.byzantiumBlock = uint64(4_370_000)
	s.constantinopleBlock = uint64(7_280_000)
	s.londonBlock = uint64(12_965_000)

	if ropsten {
		s.byzantiumBlock = uint64(1_700_000)
		s.constantinopleBlock = uint64(4_230_000)
		s.londonBlock = uint64(10_499_401)
	}

	log.Infof("Initialize rpcClientHttp '%s'", gethEndpointHTTP)

	s.rpcClient = &RPCClient{
		endpoint:   gethEndpointHTTP,
		httpClient: new(http.Client),
	}

	s.latestBlock = newLatestBlock()
	s.latestBlocks = newLatestBlocks(150)

	s.db, err = sql.ConnectDatabase(dbPath)
	if err != nil {
		return err
	}

	s.transactionReceiptWorker = &TransactionReceiptWorker{
		NumWorkers: workerCount,
		Endpoint:   gethEndpointHTTP,
	}

	s.statsByBlock = statsMap{v: make(map[uint64]sql.BlockStats)}
	s.totalsByBlock = totalsMap{v: make(map[uint64]Totals)}
	s.TotalsByTime = totalsMap{v: make(map[uint64]Totals)}

	s.transactionReceiptWorker.Initialize()

	err = s.initWaitForSyncingFalse()
	if err != nil {
		log.Errorf("error during initWaitForSyncingFalse: %v", err)
		return err
	}

	_, err = s.updateLatestBlock()
	if err != nil {
		return fmt.Errorf("error updating latest block: %v", err)
	}

	highestBlockInDB, err := s.initGetBlocksFromDB()
	if err != nil {
		log.Errorf("error during initGetGetBlocksFromDB: %v", err)
		return err
	}

	err = s.initGetLatestBlocks(highestBlockInDB)
	if err != nil {
		log.Errorf("error during initGetLatestBlocks: %v", err)
		return err
	}

	err = s.getMissingBlocks()
	if err != nil {
		log.Errorf("error during getMissingBlocks: %v", err)
		return err
	}

	err = s.updateAllTotals(s.latestBlock.getBlockNumber())
	if err != nil {
		log.Errorf("error during updateAllTotals: %v", err)
		return err
	}

	s.initializeLatestBlocks()

	return err
}

func (s *Stats) initWaitForSyncingFalse() error {
	s.ethSyncing = &Syncing{
		CurrentBlock: "0x0",
		HighestBlock: "0x0",
	}

	ethSyncing := true

	for ethSyncing {
		ethSyncingRaw, err := s.rpcClient.CallContext(
			"2.0",
			"eth_syncing",
			"",
			true,
		)
		if err != nil {
			return fmt.Errorf("failed to get syncing status from geth: %v", err)
		}

		err = json.Unmarshal(ethSyncingRaw, &ethSyncing)
		if err != nil {
			err = json.Unmarshal(ethSyncingRaw, &s.ethSyncing)
			if err != nil {
				return fmt.Errorf("couldn't unmarshal eth_syncing response: %v", ethSyncingRaw)
			}

			current, err := hexutil.DecodeUint64(s.ethSyncing.CurrentBlock)
			if err != nil {
				return fmt.Errorf("couldn't decode eth_syncing CurrentBlock: %v", err)
			}

			highest, err := hexutil.DecodeUint64(s.ethSyncing.HighestBlock)
			if err != nil {
				return fmt.Errorf("couldn't decode eth_syncing HighestBlock: %v", err)
			}

			log.Infof("init: geth is syncing: %d/%d", current, highest)
		}

		time.Sleep(5 * time.Second)
	}

	log.Infof("init: geth syncing finished")
	s.ethSyncing = nil

	return nil
}

func (s *Stats) updateLatestBlock() (uint64, error) {
	latestBlockRaw, err := s.rpcClient.CallContext(
		"2.0",
		"eth_blockNumber",
		"",
		false,
	)

	if err != nil {
		return 0, fmt.Errorf("failed to fetch latest block number from geth: %v", err)
	}

	var hexBlockNumber string
	err = json.Unmarshal(latestBlockRaw, &hexBlockNumber)
	if err != nil {
		return 0, fmt.Errorf("couldn't unmarshal latest bock number response: %v", latestBlockRaw)
	}

	latestBlockNumber, err := hexutil.DecodeUint64(hexBlockNumber)
	if err != nil {
		return 0, fmt.Errorf("latest block could not be decoded from hex to uint: %v", hexBlockNumber)
	}

	s.latestBlock.updateBlockNumber(latestBlockNumber)

	return latestBlockNumber, nil
}

func (s *Stats) initGetBlocksFromDB() (uint64, error) {
	highestBlockInDB, err := s.db.GetHighestBlockNumber()
	if err != nil {
		return s.londonBlock, fmt.Errorf("highest block not found %v", err)
	}
	log.Infof("init: GetBlocksFromDB - Highest block is %d", highestBlockInDB)

	allBlockStats, err := s.db.GetAllBlockStats()
	if err != nil {
		return s.londonBlock, fmt.Errorf("error getting totals from database: %v", err)
	}

	for _, b := range allBlockStats {
		s.statsByBlock.mu.Lock()
		s.statsByBlock.v[uint64(b.Number)] = b
		s.statsByBlock.mu.Unlock()
	}

	log.Infof("init: GetBlocksFromDB - Imported %d blocks", len(allBlockStats))

	return highestBlockInDB, nil
}

func (s *Stats) initGetLatestBlocks(highestBlockInDB uint64) error {
	currentBlock := highestBlockInDB + 1

	//set currentBlock to s.londonBlock if no blocks imported from DB
	if currentBlock == 1 {
		currentBlock = s.londonBlock
	}
	latestBlock := s.latestBlock.getBlockNumber()
	log.Infof("init: GetLatestBlocks - Fetching %d blocks (%d -> %d)", latestBlock-highestBlockInDB, currentBlock, latestBlock)

	var batchBlockStats []sql.BlockStats
	var batchBlockStatsPercentiles []sql.BlockStatsPercentiles

	if latestBlock >= currentBlock {
		for {
			var err error
			blockStats, blockStatsPercentiles, err := s.updateBlockStats(currentBlock, false)
			if err != nil {
				return fmt.Errorf("cannot update block stats for '%d',  %v", currentBlock, err)
			}

			batchBlockStats = append(batchBlockStats, blockStats)
			for _, bsp := range blockStatsPercentiles {
				batchBlockStatsPercentiles = append(batchBlockStatsPercentiles, bsp)
			}

			if currentBlock%100 == 0 || currentBlock == s.latestBlock.getBlockNumber() {
				s.db.AddBlocks(batchBlockStats, batchBlockStatsPercentiles)
				batchBlockStats = nil
				batchBlockStatsPercentiles = nil
			}

			//s.db.AddBlock(blockStats, blockStatsPercentiles)

			if currentBlock == latestBlock {
				latestBlock, err = s.updateLatestBlock()
				if err != nil {
					return fmt.Errorf("error updating latest block: %v", err)
				}
				log.Infof("Latest block: %d", latestBlock)
				if currentBlock == latestBlock {
					break
				}
			}
			currentBlock++
		}
	}

	return nil
}

func (s *Stats) getMissingBlocks() error {
	var blockNumbers, missingBlockNumbers []uint64

	if _, ok := s.statsByBlock.v[s.londonBlock]; !ok {
		missingBlockNumbers = append(missingBlockNumbers, s.londonBlock)
	}

	s.statsByBlock.mu.Lock()
	for _, b := range s.statsByBlock.v {
		blockNumbers = append(blockNumbers, uint64(b.Number))
	}
	s.statsByBlock.mu.Unlock()

	// sort slice to find missing blocks
	sort.Slice(blockNumbers, func(i, j int) bool { return blockNumbers[i] < blockNumbers[j] })

	for i := 1; i < len(blockNumbers); i++ {
		if blockNumbers[i]-blockNumbers[i-1] != 1 {
			for x := uint64(1); x < blockNumbers[i]-blockNumbers[i-1]; x++ {
				missingBlockNumber := blockNumbers[i-1] + x
				if missingBlockNumber > s.londonBlock {
					missingBlockNumbers = append(missingBlockNumbers, missingBlockNumber)
				}
			}
		}
	}

	if len(missingBlockNumbers) > 0 {
		log.Infof("init: GetMissingBlocks - Fetching %d missing blocks", len(missingBlockNumbers))

		for _, n := range missingBlockNumbers {
			blockStats, blockStatsPercentiles, err := s.updateBlockStats(n, false)
			if err != nil {
				log.Errorf("cannot update block stats for block %d: %v", n, err)
				continue
			}
			s.db.AddBlock(blockStats, blockStatsPercentiles)
		}
	}

	return nil
}

func (s *Stats) initializeLatestBlocks() {
	s.statsByBlock.mu.Lock()
	defer s.statsByBlock.mu.Unlock()

	latestBlockNumber := s.latestBlock.getBlockNumber()

	blockCount := min(s.latestBlocks.maxBlocks, len(s.statsByBlock.v))
	log.Infof("Initialize latest %d blocks", blockCount)
	for i := latestBlockNumber - uint64(blockCount); i <= latestBlockNumber; i++ {
		if blockStat, ok := s.statsByBlock.v[i]; ok {
			s.latestBlocks.addBlock(blockStat, false)
		}
	}
}

func (s *Stats) getTotals(blockNumber uint64) (Totals, error) {
	var totals Totals
	var ok bool

	s.totalsByBlock.mu.Lock()
	defer s.totalsByBlock.mu.Unlock()
	if totals, ok = s.totalsByBlock.v[blockNumber]; !ok {
		totals.Burned = "0x0"
		totals.Issuance = "0x0"
		totals.Rewards = "0x0"
		totals.Tips = "0x0"
		return totals, fmt.Errorf("error getting totals for block %d", blockNumber)
	}

	return totals, nil
}

func (s *Stats) getBlockTimestamp(blockNumber uint64) (uint64, error) {
	var blockStats sql.BlockStats
	var ok bool
	s.statsByBlock.mu.Lock()
	defer s.statsByBlock.mu.Unlock()
	if blockStats, ok = s.statsByBlock.v[blockNumber]; !ok {
		return 0, fmt.Errorf("error getting block %d", blockNumber)
	}

	return blockStats.Timestamp, nil
}

func (s *Stats) getTotalsTimeDelta(startTime uint64, endTime uint64) (Totals, error) {
	var endTotals, startTotals, totals Totals
	var ok bool

	// break up into 300second intervals as it is possible to not have a block every minute
	startMinute := startTime / 300
	endMinute := endTime / 300

	if startTime >= endTime {
		return Totals{}, fmt.Errorf("endTime must be greater than startTime")
	}
	s.TotalsByTime.mu.Lock()
	defer s.TotalsByTime.mu.Unlock()
	if endTotals, ok = s.TotalsByTime.v[endMinute]; !ok {
		totals.Burned = "0x0"
		totals.Issuance = "0x0"
		totals.Rewards = "0x0"
		totals.Tips = "0x0"
		return totals, fmt.Errorf("error getting totals for block %d", endMinute)
	}

	if startTotals, ok = s.TotalsByTime.v[startMinute]; !ok {
		totals.Burned = "0x0"
		totals.Issuance = "0x0"
		totals.Rewards = "0x0"
		totals.Tips = "0x0"
		return totals, fmt.Errorf("error getting totals for block %d", startMinute)
	}

	endBurned, err := hexutil.DecodeBig(endTotals.Burned)
	if err != nil {
		log.Errorf("endTotals.Burned is not a hex - %s", endTotals.Burned)
		return totals, err
	}
	startBurned, err := hexutil.DecodeBig(startTotals.Burned)
	if err != nil {
		log.Errorf("startTotals.Burned is not a hex - %s", startTotals.Burned)
		return totals, err
	}

	endIssuance, err := hexutil.DecodeBig(endTotals.Issuance)
	if err != nil {
		log.Errorf("endTotals.Issuance is not a hex - %s", endTotals.Issuance)
		return totals, err
	}
	startIssuance, err := hexutil.DecodeBig(startTotals.Issuance)
	if err != nil {
		log.Errorf("startTotals.Issuance is not a hex - %s", startTotals.Issuance)
		return totals, err
	}

	endRewards, err := hexutil.DecodeBig(endTotals.Rewards)
	if err != nil {
		log.Errorf("endTotals.Rewards is not a hex - %s", endTotals.Rewards)
		return totals, err
	}
	startRewards, err := hexutil.DecodeBig(startTotals.Rewards)
	if err != nil {
		log.Errorf("startTotals.Rewards is not a hex - %s", startTotals.Rewards)
		return totals, err
	}

	endTips, err := hexutil.DecodeBig(endTotals.Tips)
	if err != nil {
		log.Errorf("endTotals.Tips is not a hex - %s", endTotals.Tips)
		return totals, err
	}
	startTips, err := hexutil.DecodeBig(startTotals.Tips)
	if err != nil {
		log.Errorf("startTotals.Tips is not a hex - %s", startTotals.Tips)
		return totals, err
	}

	endBurned.Sub(endBurned, startBurned)
	endIssuance.Sub(endIssuance, startIssuance)
	endRewards.Sub(endRewards, startRewards)
	endTips.Sub(endTips, startTips)

	totals.Burned = hexutil.EncodeBig(endBurned)
	totals.Issuance = hexutil.EncodeBig(endIssuance)
	totals.Rewards = hexutil.EncodeBig(endRewards)
	totals.Tips = hexutil.EncodeBig(endTips)

	//ETH := big.NewInt(1_000_000_000_000_000_000)
	//endBurned.Div(endBurned, ETH)
	//endIssuance.Div(endIssuance, ETH)
	//endRewards.Div(endRewards, ETH)
	//endTips.Div(endTips, ETH)

	//log.Infof("last %d sec totals: %s burned, %s issuance, %s rewards, %s tips", endTime-startTime, endBurned.String(), endIssuance.String(), endRewards.String(), endTips.String())

	return totals, nil
}

func (s *Stats) getBlockStats() func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
	return func(c *Client, message jsonrpcMessage) (json.RawMessage, error) {
		b, err := message.Params.MarshalJSON()
		if err != nil {
			return nil, err
		}

		var params []interface{}
		err = json.Unmarshal(b, &params)
		if err != nil {
			return nil, err
		}

		if len(params) == 0 {
			return nil, fmt.Errorf("no parameters provided %s", message.Method)
		}

		var blockNumberHex string

		blockNumberHex, ok := params[0].(string)
		if !ok {
			return nil, fmt.Errorf("starting block is not a string - %v", params[0])
		}

		blockNumber, err := hexutil.DecodeUint64(blockNumberHex)
		if err != nil {
			return nil, err
		}

		latestBlockNumber := (s.latestBlock.getBlockNumber())
		if blockNumber > latestBlockNumber {
			return nil, err
		}

		var blockStats sql.BlockStats

		s.statsByBlock.mu.Lock()
		if blockStats, ok = s.statsByBlock.v[blockNumber]; !ok {
			log.Printf("error fetching block stats for block #%d", blockNumber)
			s.statsByBlock.mu.Unlock()
			return nil, err
		}
		s.statsByBlock.mu.Unlock()

		blockStatsJSON, err := json.Marshal(blockStats)
		if err != nil {
			log.Errorf("Error marshaling block stats: %vn", err)
		}

		return json.RawMessage(blockStatsJSON), nil
	}
}

func (s *Stats) getBaseFeeNext(blockNumber uint64) (string, error) {
	s.statsByBlock.mu.Lock()
	defer s.statsByBlock.mu.Unlock()

	block := s.statsByBlock.v[blockNumber]

	baseFee, err := hexutil.DecodeBig(block.BaseFee)
	if err != nil {
		baseFee = big.NewInt(0)
		log.Errorf("block.BaseFee is not a hex - %s", block.BaseFee)
		return "", err
	}

	gasUsed, err := hexutil.DecodeBig(block.GasUsed)
	if err != nil {
		gasUsed = big.NewInt(0)
		log.Errorf("block.GasUsed is not a hex - %s", block.GasUsed)
		return "", err
	}

	gasTarget, err := hexutil.DecodeBig(block.GasTarget)
	if err != nil {
		gasTarget = big.NewInt(0)
		log.Errorf("block.GasTarget is not a hex - %s", block.GasTarget)
		return "", err
	}

	baseFeeNext := big.NewInt(0)
	baseFeeNext.Add(baseFeeNext, gasUsed)
	baseFeeNext.Sub(baseFeeNext, gasTarget)
	baseFeeNext.Mul(baseFeeNext, baseFee)
	baseFeeNext.Quo(baseFeeNext, gasTarget)
	baseFeeNext.Quo(baseFeeNext, big.NewInt(8))
	baseFeeNext.Add(baseFeeNext, baseFee)

	return hexutil.EncodeBig(baseFeeNext), nil
}

func (s *Stats) updateTotals(blockNumber uint64) error {
	s.statsByBlock.mu.Lock()
	s.totalsByBlock.mu.Lock()
	s.TotalsByTime.mu.Lock()
	defer s.statsByBlock.mu.Unlock()
	defer s.totalsByBlock.mu.Unlock()
	defer s.TotalsByTime.mu.Unlock()

	//recalculate totals for previous 10 blocks in case blocks missed
	for i := blockNumber - 10; i <= blockNumber; i++ {
		totals := Totals{}
		totalBurned := big.NewInt(0)
		totalIssuance := big.NewInt(0)
		totalRewards := big.NewInt(0)
		totalTips := big.NewInt(0)

		block := s.statsByBlock.v[i]
		blockBurned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			blockBurned = big.NewInt(0)
			log.Errorf("block.Burned is not a hex - %s", block.Burned)
		}
		blockRewards, err := hexutil.DecodeBig(block.Rewards)
		if err != nil {
			blockRewards = big.NewInt(0)
			log.Errorf("block.Reward is not a hex - %s", block.Rewards)
		}
		blockTips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			blockTips = big.NewInt(0)
			log.Errorf("block.Tips is not a hex - %s", block.Tips)
		}

		prevTotals := s.totalsByBlock.v[i-1]
		prevTotalBurned, err := hexutil.DecodeBig(prevTotals.Burned)
		if err != nil {
			prevTotalBurned = big.NewInt(0)
			log.Errorf("prevTotals.Burned is not a hex - %s", prevTotals.Burned)
		}
		prevTotalRewards, err := hexutil.DecodeBig(prevTotals.Rewards)
		if err != nil {
			prevTotalRewards = big.NewInt(0)
			log.Errorf("prevTotals.Rewards is not a hex - %s", prevTotals.Rewards)
		}
		prevTotalTips, err := hexutil.DecodeBig(prevTotals.Tips)
		if err != nil {
			prevTotalTips = big.NewInt(0)
			log.Errorf("prevTotals.Tips (%d) is not a hex - %s", i-1, prevTotals.Tips)
		}

		totalBurned.Add(prevTotalBurned, blockBurned)
		totalRewards.Add(prevTotalRewards, blockRewards)
		totalIssuance.Sub(totalRewards, totalBurned)
		totalTips.Add(prevTotalTips, blockTips)

		totals.Burned = hexutil.EncodeBig(totalBurned)
		totals.Issuance = hexutil.EncodeBig(totalIssuance)
		totals.Rewards = hexutil.EncodeBig(totalRewards)
		totals.Tips = hexutil.EncodeBig(totalTips)

		s.totalsByBlock.v[i] = totals
		// break up into 300second intervals as it is possible to not have a block every minute
		s.TotalsByTime.v[uint64(block.Timestamp)/300] = totals

		//log.Infof("block %d totals: %s burned, %s issuance, %s rewards, and %s tips", i, totalBurned.String(), totalIssuance.String(), totalRewards.String(), totalTips.String())
	}

	return nil
}

func (s *Stats) updateAllTotals(blockNumber uint64) error {
	start := time.Now()
	var totals Totals

	log.Infof("Updating totals for every block from %d to %d (%d blocks)", s.londonBlock, blockNumber, blockNumber-s.londonBlock)

	totalBurned := big.NewInt(0)
	totalIssuance := big.NewInt(0)
	totalRewards := big.NewInt(0)
	totalTips := big.NewInt(0)

	s.statsByBlock.mu.Lock()
	defer s.statsByBlock.mu.Unlock()

	for i := s.londonBlock; i <= blockNumber; i++ {
		block := s.statsByBlock.v[i]

		burned, err := hexutil.DecodeBig(block.Burned)
		if err != nil {
			return fmt.Errorf("block %d: block.Burned was not a hex - %s", i, block.Burned)
		}
		totalBurned.Add(totalBurned, burned)

		rewards, err := hexutil.DecodeBig(block.Rewards)
		if err != nil {
			return fmt.Errorf("block %d: block.Rewards was not a hex - %s", i, block.Rewards)
		}
		totalRewards.Add(totalRewards, rewards)

		tips, err := hexutil.DecodeBig(block.Tips)
		if err != nil {
			return fmt.Errorf("block %d: block.Burned was not a hex - %s", i, block.Tips)
		}
		totalTips.Add(totalTips, tips)
		totalIssuance.Sub(totalRewards, totalBurned)

		totals.Burned = hexutil.EncodeBig(totalBurned)
		totals.Issuance = hexutil.EncodeBig(totalIssuance)
		totals.Rewards = hexutil.EncodeBig(totalRewards)
		totals.Tips = hexutil.EncodeBig(totalTips)

		s.totalsByBlock.mu.Lock()
		s.totalsByBlock.v[uint64(block.Number)] = totals
		s.totalsByBlock.mu.Unlock()

		s.TotalsByTime.mu.Lock()
		// break up into 300second intervals as it is possible to not have a block every minute
		s.TotalsByTime.v[uint64(block.Timestamp)/300] = totals
		s.TotalsByTime.mu.Unlock()

		if block.Number%5000 == 0 {
			log.Infof("block %d totals: %s burned, %s issuance, %s rewards, and %s tips", block.Number, totalBurned.String(), totalIssuance.String(), totalRewards.String(), totalTips.String())
		}
	}

	duration := time.Since(start) / time.Millisecond
	log.Infof("block %d totals: %s burned, %s issuance, %s rewards, and %s tips (ptime: %dms)", blockNumber, totalBurned.String(), totalIssuance.String(), totalRewards.String(), totalTips.String(), duration)

	return nil
}

func (s *Stats) processBlock(blockNumber uint64, blockRepeated bool) (sql.BlockStats, error) {
	// fetch block, process stats, and update block stats maps
	blockStats, blockStatsPercentiles, err := s.updateBlockStats(blockNumber, blockRepeated)
	if err != nil {
		log.Errorf("Error getting block stats for block %d: %v", blockNumber, err)
	}

	if blockRepeated {
		s.statsByBlock.mu.Lock()
		existingBlockStats := s.statsByBlock.v[blockNumber]
		s.statsByBlock.mu.Unlock()
		//if blockStats and existingBlockStats are same, return empty stats
		if reflect.DeepEqual(blockStats, existingBlockStats) {
			log.Infof("block %d unchanged", blockNumber)
			return sql.BlockStats{}, nil
		}
	}

	// check for and update missing blocks
	err = s.getMissingBlocks()
	if err != nil {
		log.Errorf("error during initGetMissingBlocks: %v", err)
	}

	// calculate and update totals for block
	err = s.updateTotals(blockNumber)
	if err != nil {
		log.Errorf("Error updating totals for block %d: %v", blockNumber, err)
	}

	// add block to latestBlocks array
	s.latestBlocks.addBlock(blockStats, false)

	// update latestBlock after block has processed and stored for global access
	s.latestBlock.updateBlockNumber(blockNumber)

	// add to database
	s.db.AddBlock(blockStats, blockStatsPercentiles)

	return blockStats, nil
}

func (s *Stats) updateBlockStats(blockNumber uint64, updateCache bool) (sql.BlockStats, []sql.BlockStatsPercentiles, error) {
	start := time.Now()
	var blockNumberHex string
	var blockStats sql.BlockStats
	var blockStatsPercentiles []sql.BlockStatsPercentiles
	var rawResponse json.RawMessage

	blockNumberHex = hexutil.EncodeUint64(blockNumber)

	rawResponse, err := s.rpcClient.CallContext(
		"2.0",
		"eth_getBlockByNumber",
		strconv.Itoa(int(blockNumber)),
		updateCache,
		blockNumberHex,
		false,
	)
	if err != nil {
		return blockStats, blockStatsPercentiles, fmt.Errorf("error eth_getBlockByNumber: %v", err)
	}

	block := Block{}
	err = json.Unmarshal(rawResponse, &block)
	if err != nil {
		return blockStats, blockStatsPercentiles, fmt.Errorf("error eth_getBlockByNumber Unmarshal Block: %v", err)
	}

	header := types.Header{}
	err = json.Unmarshal(rawResponse, &header)
	if err != nil {
		return blockStats, blockStatsPercentiles, fmt.Errorf("error eth_getBlockByNumber Unmarshal Header: %v", err)
	}

	gasUsed, err := hexutil.DecodeBig(block.GasUsed)
	if err != nil {
		return blockStats, blockStatsPercentiles, fmt.Errorf("error decode GasUsed (%s): %v", block.GasUsed, err)
	}

	gasTarget, err := hexutil.DecodeBig(block.GasLimit)
	if err != nil {
		return blockStats, blockStatsPercentiles, fmt.Errorf("error decode GasLimit (%s): %v", block.GasLimit, err)
	}

	if blockNumber > s.londonBlock {
		gasTarget.Div(gasTarget, big.NewInt(2))
	}

	// initial london block is 1Gwei baseFee
	baseFee := big.NewInt(1_000_000_000)

	if block.BaseFeePerGas != "" {
		baseFee, err = hexutil.DecodeBig(block.BaseFeePerGas)
		if err != nil {
			return blockStats, blockStatsPercentiles, fmt.Errorf("error decode BaseFeePerGas (%s): %v", block.BaseFeePerGas, err)
		}
	}

	transactionCount := big.NewInt(int64(len(block.Transactions)))

	blockBurned := big.NewInt(0)
	blockTips := big.NewInt(0)

	blockReward := s.getBaseReward(blockNumber)

	for n, uncleHash := range block.Uncles {
		var raw json.RawMessage
		raw, err := s.rpcClient.CallContext(
			"2.0",
			"eth_getUncleByBlockNumberAndIndex",
			strconv.Itoa(int(blockNumber)),
			updateCache,
			blockNumberHex,
			hexutil.EncodeUint64(uint64(n)),
		)
		if err != nil {
			return blockStats, blockStatsPercentiles, fmt.Errorf("error eth_getUncleByBlockNumberAndIndex: %v", err)
		}

		uncle := Block{}
		err = json.Unmarshal(raw, &uncle)
		if err != nil {
			return blockStats, blockStatsPercentiles, fmt.Errorf("error eth_getUncleByBlockNumberAndIndex Unmarshal uncle: %v", err)
		}

		if uncleHash != uncle.Hash {
			err = fmt.Errorf("uncle hash doesn't match: have %s and want %s", uncleHash, uncle.Hash)
			return blockStats, blockStatsPercentiles, err
		}

		uncleBlockNumber, err := hexutil.DecodeUint64(uncle.Number)
		if err != nil {
			return blockStats, blockStatsPercentiles, fmt.Errorf("error decode uncle (%s): %v", uncle.Number, err)
		}

		uncleMinerReward := s.getBaseReward(blockNumber)
		blockDiffFactor := big.NewInt(int64(uncleBlockNumber) - int64(blockNumber) + 8)
		uncleMinerReward.Mul(&uncleMinerReward, blockDiffFactor)
		uncleMinerReward.Div(&uncleMinerReward, big.NewInt(8))

		uncleInclusionReward := s.getBaseReward(blockNumber)
		uncleInclusionReward.Div(&uncleInclusionReward, big.NewInt(32))

		blockReward.Add(&blockReward, &uncleMinerReward)
		blockReward.Add(&blockReward, &uncleInclusionReward)
	}

	var allPriorityFeePerGasMwei []uint64

	// Fetch all transaction receipts to calculate burned, and tips.
	batchPriorityFee, batchBurned, batchTips, type2count := s.transactionReceiptWorker.QueueJob(block.Transactions, blockNumber, baseFee, updateCache)
	allPriorityFeePerGasMwei = append(batchPriorityFee[:], allPriorityFeePerGasMwei[:]...)
	blockBurned.Add(blockBurned, batchBurned)
	blockTips.Add(blockTips, batchTips)

	// sort slices that will be used for percentile calculations later
	sort.Slice(allPriorityFeePerGasMwei, func(i, j int) bool { return allPriorityFeePerGasMwei[i] < allPriorityFeePerGasMwei[j] })

	blockStatsPercentiles = append(blockStatsPercentiles, sql.BlockStatsPercentiles{
		Number:       uint(blockNumber),
		Metric:       "PFpG",
		Maximum:      uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 100)),
		Median:       uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 50)),
		Minimum:      uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 0)),
		Tenth:        uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 10)),
		TwentyFifth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 25)),
		SeventyFifth: uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 75)),
		Ninetieth:    uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 90)),
		NinetyFifth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
		NinetyNinth:  uint(getPercentileSortedUint64(allPriorityFeePerGasMwei, 95)),
	})

	priorityFee := big.NewInt(int64(getPercentileSortedUint64(allPriorityFeePerGasMwei, 50)))
	priorityFee.Mul(priorityFee, big.NewInt(1_000_000))

	blockStats.Number = uint(blockNumber)
	blockStats.Timestamp = header.Time
	blockStats.BaseFee = hexutil.EncodeBig(baseFee)
	blockStats.Burned = hexutil.EncodeBig(blockBurned)
	blockStats.GasTarget = hexutil.EncodeBig(gasTarget)
	blockStats.GasUsed = hexutil.EncodeBig(gasUsed)
	blockStats.PriorityFee = hexutil.EncodeBig(priorityFee)
	blockStats.Rewards = hexutil.EncodeBig(&blockReward)
	blockStats.Tips = hexutil.EncodeBig(blockTips)
	blockStats.Transactions = hexutil.EncodeBig(transactionCount)
	blockStats.Type2Transactions = hexutil.EncodeBig(type2count)

	s.statsByBlock.mu.Lock()
	s.statsByBlock.v[blockNumber] = blockStats
	s.statsByBlock.mu.Unlock()

	// convert stats practical units when logging
	gWEI := big.NewInt(1_000_000_000)
	baseFee.Div(baseFee, gWEI)

	mETH := big.NewInt(1_000_000_000_000_000)
	blockReward.Div(&blockReward, mETH)
	blockTips.Div(blockTips, mETH)
	blockBurned.Div(blockBurned, mETH)

	duration := time.Since(start) / time.Millisecond
	log.Printf("block: %d, blockHex: %s, timestamp: %d, gas_target: %s, gas_used: %s, rewards: %s mETH, tips: %s mETH, baseFee: %s GWEI, burned: %s mETH, transactions: %s, type2: %s, ptime: %dms", blockNumber, blockNumberHex, header.Time, gasTarget.String(), gasUsed.String(), blockReward.String(), blockTips.String(), baseFee.String(), blockBurned.String(), transactionCount.String(), type2count.String(), duration)

	return blockStats, blockStatsPercentiles, nil
}

func getPercentileSortedUint64(values []uint64, perc int) uint64 {
	if len(values) == 0 {
		return 0
	}
	if perc == 100 {
		return values[len(values)-1]
	}

	rank := int(math.Ceil(float64(len(values)) * float64(perc) / 100))

	if rank == 0 {
		return values[0]
	}

	return values[rank-1]
}

func (s *Stats) getBaseReward(blockNum uint64) big.Int {
	baseReward := big.NewInt(0)
	if blockNum >= s.constantinopleBlock {
		constantinopleReward := big.NewInt(2000000000000000000)
		baseReward.Add(baseReward, constantinopleReward)
		return *baseReward
	}

	if blockNum >= s.byzantiumBlock {
		byzantiumReward := big.NewInt(3000000000000000000)
		baseReward.Add(baseReward, byzantiumReward)
		return *baseReward
	}

	genesisReward := big.NewInt(5000000000000000000)
	baseReward.Add(baseReward, genesisReward)
	return *baseReward
}

func min(x, y int) int {
	if x < y {
		return x
	}
	return y
}
