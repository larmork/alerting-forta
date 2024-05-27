import { ETH_20K, HOUR_1, ETH_10K, DAYS_3, ETH_2, StethOperationSrv, IStethClient } from './StethOperation.srv'
import { StethOperationCache } from './StethOperation.cache'
import * as E from 'fp-ts/Either'
import { Address, ETH_DECIMALS } from '../../utils/constants'
import { getDepositSecurityEvents } from '../../utils/events/deposit_security_events'
import { getLidoEvents } from '../../utils/events/lido_events'
import { getInsuranceFundEvents } from '../../utils/events/insurance_fund_events'
import { getBurnerEvents } from '../../utils/events/burner_events'
import { expect } from '@jest/globals'
import { TransactionResponse } from '@ethersproject/abstract-provider'
import { faker } from '@faker-js/faker'
import { BigNumber as EtherBigNumber } from 'ethers'
import BigNumber from 'bignumber.js'
import * as Winston from 'winston'
import { TypedEvent } from '../../generated/typechain/common'
import { StakingLimitInfo } from '../../entity/staking_limit_info'
import { StethClientMock } from './mocks/mock'
import { TypedEventMock } from './mocks/eth_evnt.mock'
import { Finding } from '../../generated/proto/alert_pb'

describe('StethOperationSrv', () => {
  let ethProviderMock: jest.Mocked<IStethClient>

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const address = Address
  beforeEach(() => {
    ethProviderMock = StethClientMock()
  })

  describe('initialize', () => {
    test(`ethProvider.getHistory error`, async () => {
      const want = new Error(`getHistory error`)
      ethProviderMock.getHistory.mockResolvedValue(E.left(want))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(new Error('getHistory error'))
    })

    test(`ethProvider.getStethBalance error`, async () => {
      const want = new Error(`getStethBalance error`)

      const TransactionResponseMock: TransactionResponse[] = [
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
        },
      ]
      ethProviderMock.getHistory.mockResolvedValue(E.right(TransactionResponseMock))
      ethProviderMock.getStethBalance.mockResolvedValue(E.left(want))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(want)
    })

    test(`success`, async () => {
      const want = null

      const depositorTxTimeEarlier = 1702939609549
      const depositorTxTimeLater = 1702939619549
      const TransactionResponseMock: TransactionResponse[] = [
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
          timestamp: depositorTxTimeEarlier,
        },
        {
          nonce: faker.number.int(),
          hash: faker.string.hexadecimal(),
          gasLimit: EtherBigNumber.from(faker.number.int()),
          confirmations: faker.number.int(),
          data: faker.string.hexadecimal(),
          value: EtherBigNumber.from(faker.number.int()),
          chainId: 1,
          from: faker.string.hexadecimal(),
          wait: jest.fn(),
          timestamp: depositorTxTimeLater,
        },
      ]
      ethProviderMock.getHistory.mockResolvedValue(E.right(TransactionResponseMock))

      const stethBalanceMock = new BigNumber(faker.number.bigInt().toString())
      ethProviderMock.getStethBalance.mockResolvedValue(E.right(stethBalanceMock))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const result = await srv.initialize(currentBlock)

      expect(result).toStrictEqual(want)
      expect(cache.getLastBufferedEth()).toEqual(stethBalanceMock)
      expect(cache.getLastDepositorTxTime()).toEqual(depositorTxTimeLater)
    })
  })

  describe('handleBufferedEth', () => {
    test(`ethProvider.getBufferedEther error`, async () => {
      const getBufferedEtherErr = new Error(`getBufferedEther error`)
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(getBufferedEtherErr))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.bufferedEthRaw',
        name: 'Error in StethOperationSrv.handleBufferedEth:240',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test(`lidoContract.getDepositableEther error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())

      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValue(E.left(new Error('getDepositableEtherErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061500
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.getDepositableEther',
        name: 'Error in StethOperationSrv.handleBufferedEth:321',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })
    test(`lidoContract.shifte3dBufferedEthRaw error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))

      // shifte3dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(new Error('shifte3dBufferedEthRawErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.shifte3dBufferedEthRaw',
        name: 'Error in StethOperationSrv.handleBufferedEth:241',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })
    test(`lidoContract.shifte4dBufferedEthRaw error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValue(E.right(new BigNumber(faker.number.int())))

      // shifte3dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.left(new Error('shifte4dBufferedEthRawErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.shifte4dBufferedEthRaw',
        name: 'Error in StethOperationSrv.handleBufferedEth:242',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test(`unbufferedEventsErr error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      // lidoContractMock.filters.Unbuffered.mockResolvedValue()
      ethProviderMock.getUnbufferedEvents.mockResolvedValue(E.left(new Error('UnbufferedEventsErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.getUnbufferedEvents',
        name: 'Error in StethOperationSrv.handleBufferedEth:278',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test(`wdReqFinalizedEvents error`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))
      ethProviderMock.getUnbufferedEvents.mockResolvedValueOnce(E.right([]))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock(), TypedEventMock()]

      ethProviderMock.getUnbufferedEvents.mockResolvedValue(E.right(unbufferedEvents))

      ethProviderMock.getWithdrawalsFinalizedEvents.mockResolvedValue(E.left(new Error('wdReqFinalizedEventsErr')))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: 'Could not call ethProvider.getWithdrawalsFinalizedEvents',
        name: 'Error in StethOperationSrv.handleBufferedEth:279',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test(`unbufferedEvents.length === 0 && wdReqFinalizedEvents.length === 0`, async () => {
      const getBufferedEther = new BigNumber(faker.number.int())
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(getBufferedEther))
      ethProviderMock.getDepositableEther.mockResolvedValueOnce(E.right(new BigNumber(faker.number.int())))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(faker.number.int())
      const shifte4dBufferedEthRaw = new BigNumber(shifte3dBufferedEthRaw.plus(faker.number.int()))
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = []
      ethProviderMock.getUnbufferedEvents.mockResolvedValueOnce(E.right(unbufferedEvents))
      const wdReqFinalizedEvents: TypedEvent[] = []
      ethProviderMock.getWithdrawalsFinalizedEvents.mockResolvedValueOnce(E.right(wdReqFinalizedEvents))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449
      const currentBlockTimestamp = faker.date.past().getTime()
      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const shiftedBlockNumber = currentBlock - 3
      const expected = {
        alertId: 'BUFFERED-ETH-DRAIN',
        description:
          `Buffered ETH amount decreased from ` +
          `${shifte4dBufferedEthRaw.div(ETH_DECIMALS).toFixed(2)} ` +
          `to ${shifte3dBufferedEthRaw.div(ETH_DECIMALS).toFixed(2)} ` +
          `without Unbuffered or WithdrawalsFinalized events\n\nNote: actual handled block number is ${shiftedBlockNumber}`,
        name: '🚨🚨🚨 Buffered ETH drain',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test(`⚠️ High depositable ETH amount`, async () => {
      const bufferedEther = new BigNumber(180).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(bufferedEther))

      const mockDepositableEther = EtherBigNumber.from(ETH_10K + 1).mul(EtherBigNumber.from(ETH_DECIMALS.toString()))
      ethProviderMock.getDepositableEther.mockResolvedValue(E.right(new BigNumber(mockDepositableEther.toString())))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(200)
      const shifte4dBufferedEthRaw = new BigNumber(100)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock()]
      ethProviderMock.getUnbufferedEvents.mockResolvedValue(E.right(unbufferedEvents))
      const wdReqFinalizedEvents: TypedEvent[] = [TypedEventMock()]
      ethProviderMock.getWithdrawalsFinalizedEvents.mockResolvedValue(E.right(wdReqFinalizedEvents))

      const currentBlock = 19061500
      const date = new Date('2024-01-22')
      const currentBlockTimestamp = date.getTime()

      const cache = new StethOperationCache()

      cache.setLastDepositorTxTime(date.setHours(-(DAYS_3 + 1)))
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const bufferedEth = bufferedEther.div(ETH_DECIMALS).toNumber()
      const expected = {
        alertId: 'HIGH-DEPOSITABLE-ETH',
        description:
          `There are ${bufferedEth.toFixed(2)} ` +
          `depositable ETH in DAO and there are more than ` +
          `${Math.floor(DAYS_3 / (60 * 60))} ` +
          `hours since last Depositor TX`,
        name: '⚠️ High depositable ETH amount',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)

      expect(cache.getLastReportedDepositableEthTimestamp()).toEqual(currentBlockTimestamp)
    })

    test(`🚨 Huge depositable ETH amount`, async () => {
      const bufferedEther = new BigNumber(180).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(bufferedEther))

      const mockDepositableEther = EtherBigNumber.from(ETH_20K + 1).mul(EtherBigNumber.from(ETH_DECIMALS.toString()))
      ethProviderMock.getDepositableEther.mockResolvedValueOnce(E.right(new BigNumber(mockDepositableEther.toString())))

      // shifte3dBufferedEthRaw
      const shifte3dBufferedEthRaw = new BigNumber(200)
      const shifte4dBufferedEthRaw = new BigNumber(100)
      ethProviderMock.getBufferedEther.mockResolvedValueOnce(E.right(shifte3dBufferedEthRaw))
      // shifte4dBufferedEthRaw
      ethProviderMock.getBufferedEther.mockResolvedValue(E.right(shifte4dBufferedEthRaw))

      const unbufferedEvents: TypedEvent[] = [TypedEventMock()]
      ethProviderMock.getUnbufferedEvents.mockResolvedValue(E.right(unbufferedEvents))
      const wdReqFinalizedEvents: TypedEvent[] = [TypedEventMock()]
      ethProviderMock.getWithdrawalsFinalizedEvents.mockResolvedValue(E.right(wdReqFinalizedEvents))

      const currentBlock = 19061500
      const date = new Date('2024-01-22')
      const currentBlockTimestamp = date.getTime()

      const cache = new StethOperationCache()

      cache.setCriticalDepositableAmountTimestamp(date.setHours(-26))

      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const result = await srv.handleBufferedEth(currentBlock, currentBlockTimestamp)

      const expected = {
        alertId: 'HUGE-DEPOSITABLE-ETH',
        description:
          `There are 20001.00 depositable ETH in DAO for more than ` + `${Math.floor(HOUR_1 / (60 * 60))} hour(s)`,
        name: '🚨 Huge depositable ETH amount',
        severity: Finding.Severity.HIGH,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)

      expect(cache.getLastReportedDepositableEthTimestamp()).toEqual(currentBlockTimestamp)
    })
  })

  describe('handleDepositExecutorBalance', () => {
    test('getBalanceErr', async () => {
      const executorBalanceRaw = new Error('getBalanceErr')
      ethProviderMock.getBalance.mockResolvedValueOnce(E.left(executorBalanceRaw))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleDepositExecutorBalance(blockNumber, currentBlockDate.getTime())

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: `Could not call ethProvider.getBalance`,
        name: 'Error in StethOperationSrv.handleDepositExecutorBalance:396',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test('⚠️ Low deposit executor balance', async () => {
      const executorBalanceRaw = new BigNumber(ETH_2 - 1).multipliedBy(ETH_DECIMALS)
      ethProviderMock.getBalance.mockResolvedValueOnce(E.right(executorBalanceRaw))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleDepositExecutorBalance(blockNumber, currentBlockDate.getTime())

      const expected = {
        alertId: 'LOW-DEPOSIT-EXECUTOR-BALANCE',
        description: `Balance of deposit executor is 1.0000. This is extremely low! 😱`,
        name: '⚠️ Low deposit executor balance',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)

      expect(cache.getLastReportedExecutorBalanceTimestamp()).toEqual(currentBlockDate.getTime())
    })
  })

  describe('handleStakingLimit', () => {
    test('getStakingLimitInfoErr', async () => {
      const getStakingLimitInfo = new Error('getStakingLimitInfoErr')
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.left(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = {
        alertId: 'NETWORK-ERROR',
        description: `Could not call ethProvider.getStakingLimitInfo`,
        name: 'Error in StethOperationSrv.handleStakingLimit:430',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    })

    test('⚠️ Unspent staking limit below 10%', async () => {
      const getStakingLimitInfo: StakingLimitInfo = {
        currentStakeLimit: new BigNumber(9),
        isStakingPaused: false,
        maxStakeLimit: new BigNumber(100),
      }
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.right(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = {
        alertId: 'LOW-STAKING-LIMIT',
        description: `Current staking limit is lower than 10% of max staking limit`,
        name: '⚠️ Unspent staking limit below 10%',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)

      expect(cache.getLastReportedStakingLimit10Timestamp()).toEqual(currentBlockDate.getTime())
    })

    test('📉 Staking limit below 30%', async () => {
      const getStakingLimitInfo: StakingLimitInfo = {
        currentStakeLimit: new BigNumber(250),
        isStakingPaused: false,
        maxStakeLimit: new BigNumber(1000),
      }
      ethProviderMock.getStakingLimitInfo.mockResolvedValueOnce(E.right(getStakingLimitInfo))

      const cache = new StethOperationCache()
      const srv = new StethOperationSrv(
        logger,
        cache,
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const blockNumber = 19061500
      const currentBlockDate = new Date('2022-01-21')
      const result = await srv.handleStakingLimit(blockNumber, currentBlockDate.getTime())

      const expected = {
        alertId: 'LOW-STAKING-LIMIT',
        description: `Current staking limit is 250.00 ETH this is lower than 30% of max staking limit 1000.00 ETH`,
        name: '📉 Unspent staking limit below 30%',
        severity: Finding.Severity.INFO,
        type: Finding.FindingType.INFORMATION,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)

      expect(srv.getStorage().getLastReportedStakingLimit30Timestamp()).toEqual(currentBlockDate.getTime())
    })
  })

  describe('handleShareRateChange', () => {
    test(`ethProviderErr`, async () => {
      const want = new Error(`getShareRateErr`)
      ethProviderMock.getShareRate.mockResolvedValue(E.left(want))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449

      srv.getStorage().setShareRate({
        blockNumber: currentBlock + 1,
        amount: new BigNumber('1.15490045560519776042410219381324898101464198621e+27'),
      })

      const result = await srv.handleShareRateChange(currentBlock)

      const expectedShareRateErrFinding = {
        alertId: 'NETWORK-ERROR',
        description: `Could not call ethProvider.getShareRate`,
        name: 'Error in StethOperationSrv.handleShareRateChange:137',
        severity: Finding.Severity.UNKNOWN,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result[0].getAlertid()).toEqual(expectedShareRateErrFinding.alertId)
      expect(result[0].getDescription()).toEqual(expectedShareRateErrFinding.description)
      expect(result[0].getName()).toEqual(expectedShareRateErrFinding.name)
      expect(result[0].getSeverity()).toEqual(expectedShareRateErrFinding.severity)
      expect(result[0].getType()).toEqual(expectedShareRateErrFinding.type)
    })

    test(`should found invariant on +0.15`, async () => {
      const cachedShareRate = new BigNumber('1.15490045560519776042410219381324898101464198621e+27')

      ethProviderMock.getShareRate.mockResolvedValue(
        E.right(cachedShareRate.plus(new BigNumber('0.15490045560519776042410219381324898101464198621e+27'))),
      )

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449

      srv.getStorage().setShareRate({
        blockNumber: currentBlock - 1,
        amount: cachedShareRate,
      })

      const result = await srv.handleShareRateChange(currentBlock)

      const expectedShareRateErrFinding = {
        alertId: 'LIDO-INVARIANT-ERROR',
        description:
          `Prev.shareRate(19061448) = 1.1549004556051977e+27 \n` +
          `Curr.shareRate(19061449) = 1.3098009112103954e+27 \n` +
          `Diff: 1.5490045560519778e+26`,
        name: '🚨🚨🚨 Share rate unexpected has changed',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result[0].getName()).toEqual(expectedShareRateErrFinding.name)
      expect(result[0].getDescription()).toEqual(expectedShareRateErrFinding.description)
      expect(result[0].getAlertid()).toEqual(expectedShareRateErrFinding.alertId)
      expect(result[0].getSeverity()).toEqual(expectedShareRateErrFinding.severity)
      expect(result[0].getType()).toEqual(expectedShareRateErrFinding.type)
    })

    test(`should found invariant on -0.15`, async () => {
      const cachedShareRate = new BigNumber('1.15490045560519776042410219381324898101464198621e+27')

      ethProviderMock.getShareRate.mockResolvedValue(
        E.right(cachedShareRate.minus(new BigNumber('0.15490045560519776042410219381324898101464198621e+27'))),
      )

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449

      srv.getStorage().setShareRate({
        blockNumber: currentBlock - 1,
        amount: cachedShareRate,
      })

      const result = await srv.handleShareRateChange(currentBlock)

      const expectedShareRateErrFinding = {
        alertId: 'LIDO-INVARIANT-ERROR',
        description:
          `Prev.shareRate(19061448) = 1.1549004556051977e+27 \n` +
          `Curr.shareRate(19061449) = 1e+27 \n` +
          `Diff: -1.5490045560519778e+26`,
        name: '🚨🚨🚨 Share rate unexpected has changed',
        severity: Finding.Severity.CRITICAL,
        type: Finding.FindingType.SUSPICIOUS,
      }

      expect(result[0].getAlertid()).toEqual(expectedShareRateErrFinding.alertId)
      expect(result[0].getDescription()).toEqual(expectedShareRateErrFinding.description)
      expect(result[0].getName()).toEqual(expectedShareRateErrFinding.name)
      expect(result[0].getSeverity()).toEqual(expectedShareRateErrFinding.severity)
      expect(result[0].getType()).toEqual(expectedShareRateErrFinding.type)
    })

    test(`should not found invariant on 0.00001`, async () => {
      const cachedShareRate = new BigNumber('1.15490045560519776042410219381324898101464198621e+27')

      ethProviderMock.getShareRate.mockResolvedValue(E.right(cachedShareRate.plus(new BigNumber('0.00001'))))

      const srv = new StethOperationSrv(
        logger,
        new StethOperationCache(),
        ethProviderMock,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,

        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const currentBlock = 19061449

      srv.getStorage().setShareRate({
        blockNumber: currentBlock - 1,
        amount: cachedShareRate,
      })

      const result = await srv.handleShareRateChange(currentBlock)
      expect(result.length).toEqual(0)
    })
  })
})
