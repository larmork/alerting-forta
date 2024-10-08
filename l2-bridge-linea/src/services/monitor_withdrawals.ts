import BigNumber from 'bignumber.js'
import { filterLog, Finding, FindingSeverity, FindingType } from 'forta-agent'
import { BlockDto, WithdrawalRecord } from 'src/entity/blockDto'
import { Log } from '@ethersproject/abstract-provider'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { getUniqueKey } from '../utils/finding.helpers'
import { NetworkError } from '../utils/error'
import { BridgingInitiatedEvent } from '../generated/TokenBridge'

// 48 hours
const MAX_WITHDRAWALS_WINDOW = 60 * 60 * 24 * 2
const ETH_DECIMALS = new BigNumber(10).pow(18)
// 10k wstETH
const MAX_WITHDRAWALS_SUM = 10_000

type IWithdrawalRecord = {
  time: number
  amount: BigNumber
}

export type MonitorWithdrawalsInitResp = {
  currentWithdrawals: string
}

export abstract class IMonitorWithdrawalsClient {
  public abstract getWithdrawalEvents(
    fromBlockNumber: number,
    toBlockNumber: number,
  ): Promise<E.Either<NetworkError, BridgingInitiatedEvent[]>>

  public abstract getWithdrawalRecords(
    withdrawalEvents: BridgingInitiatedEvent[],
  ): Promise<E.Either<NetworkError, WithdrawalRecord[]>>
}

export class MonitorWithdrawals {
  private name: string = 'WithdrawalsMonitor'

  private readonly l2Erc20TokenGatewayAddress: string
  private readonly withdrawalInitiatedEvent: string =
    'event BridgingInitiated(address indexed sender, address recipient, address indexed token, uint256 indexed amount)'

  private readonly logger: Logger
  private readonly withdrawalsClient: IMonitorWithdrawalsClient

  private withdrawalsCache: IWithdrawalRecord[] = []
  private lastReportedToManyWithdrawals = 0

  constructor(withdrawalsClient: IMonitorWithdrawalsClient, l2Erc20TokenGatewayAddress: string, logger: Logger) {
    this.withdrawalsClient = withdrawalsClient
    this.l2Erc20TokenGatewayAddress = l2Erc20TokenGatewayAddress
    this.logger = logger
  }

  public getName(): string {
    return this.name
  }

  public async initialize(currentBlock: number): Promise<E.Either<Error, MonitorWithdrawalsInitResp>> {
    // 48 hours
    const pastBlock = currentBlock - Math.ceil(MAX_WITHDRAWALS_WINDOW / 13)

    const withdrawalEvents = await this.withdrawalsClient.getWithdrawalEvents(pastBlock, currentBlock - 1)
    if (E.isLeft(withdrawalEvents)) {
      return withdrawalEvents
    }

    const withdrawalRecords = await this.withdrawalsClient.getWithdrawalRecords(withdrawalEvents.right)
    if (E.isLeft(withdrawalRecords)) {
      return withdrawalRecords
    }

    const withdrawalsSum = new BigNumber(0)
    for (const wc of withdrawalRecords.right) {
      withdrawalsSum.plus(wc.amount)
      this.withdrawalsCache.push(wc)
    }

    this.logger.info(`${MonitorWithdrawals.name} started on block ${currentBlock}`)
    return E.right({
      currentWithdrawals: withdrawalsSum.div(ETH_DECIMALS).toFixed(2),
    })
  }

  public handleBlocks(logs: Log[], blocksDto: BlockDto[]): Finding[] {
    const start = new Date().getTime()

    // adds records into withdrawalsCache
    const withdrawalRecords = this.getWithdrawalRecords(logs, blocksDto)
    this.withdrawalsCache.push(...withdrawalRecords)

    const out: Finding[] = []

    for (const block of blocksDto) {
      // remove withdrawals records older than MAX_WITHDRAWALS_WINDOW
      const withdrawalsCache: IWithdrawalRecord[] = []
      for (const wc of this.withdrawalsCache) {
        if (wc.time > block.timestamp - MAX_WITHDRAWALS_WINDOW) {
          withdrawalsCache.push(wc)
        }
      }

      this.withdrawalsCache = withdrawalsCache

      const withdrawalsSum = new BigNumber(0)
      for (const wc of this.withdrawalsCache) {
        withdrawalsSum.plus(wc.amount)
      }

      // block number condition is meant to "sync" agents alerts
      if (withdrawalsSum.div(ETH_DECIMALS).isGreaterThanOrEqualTo(MAX_WITHDRAWALS_SUM) && block.number % 10 === 0) {
        const period =
          block.timestamp - this.lastReportedToManyWithdrawals < MAX_WITHDRAWALS_WINDOW
            ? block.timestamp - this.lastReportedToManyWithdrawals
            : MAX_WITHDRAWALS_WINDOW

        const uniqueKey = '0df95654-ecbb-4f63-a5c0-a9d584365511'

        const finding: Finding = Finding.fromObject({
          name: `⚠️ Linea: Huge withdrawals during the last ` + `${Math.floor(period / (60 * 60))} hour(s)`,
          description:
            `There were withdrawals requests from L2 to L1 for the ` +
            `${withdrawalsSum.div(ETH_DECIMALS).toFixed(4)} wstETH in total`,
          alertId: 'HUGE-WITHDRAWALS-FROM-L2',
          severity: FindingSeverity.Medium,
          type: FindingType.Suspicious,
          uniqueKey: getUniqueKey(uniqueKey, block.number),
        })

        out.push(finding)

        this.lastReportedToManyWithdrawals = block.timestamp

        const tmp: IWithdrawalRecord[] = []
        for (const wc of this.withdrawalsCache) {
          if (wc.time > block.timestamp - this.lastReportedToManyWithdrawals) {
            tmp.push(wc)
          }
        }

        this.withdrawalsCache = tmp
      }
    }

    this.logger.info(elapsedTime(MonitorWithdrawals.name + '.' + this.handleBlocks.name, start))
    return out
  }

  private getWithdrawalRecords(logs: Log[], blocksDto: BlockDto[]): WithdrawalRecord[] {
    const blockNumberToBlock = new Map<number, BlockDto>()
    const logIndexToLogs = new Map<number, Log>()
    const addresses: string[] = []

    for (const log of logs) {
      logIndexToLogs.set(log.logIndex, log)
      addresses.push(log.address)
    }

    for (const blockDto of blocksDto) {
      blockNumberToBlock.set(blockDto.number, blockDto)
    }

    const out: WithdrawalRecord[] = []
    if (this.l2Erc20TokenGatewayAddress in addresses) {
      const events = filterLog(logs, this.withdrawalInitiatedEvent, this.l2Erc20TokenGatewayAddress)

      for (const event of events) {
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const log: Log = logIndexToLogs.get(event.logIndex)
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const blockDto: BlockDto = blockNumberToBlock.get(log.blockNumber)

        out.push({
          time: blockDto.timestamp,
          amount: new BigNumber(String(event.args.amount)),
        })
      }
    }

    return out
  }
}
