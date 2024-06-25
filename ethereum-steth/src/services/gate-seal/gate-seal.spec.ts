import { Address, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024 } from '../../utils/constants'
import { either as E } from 'fp-ts'
import { GateSeal } from '../../entity/gate_seal'
import { expect } from '@jest/globals'
import { BlockDto, TransactionDto } from '../../entity/events'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from '../../generated/typechain'
import { GateSealSrv, IGateSealClient } from './GateSeal.srv'
import { GateSealCache } from './GateSeal.cache'
import * as Winston from 'winston'
import { ETHProvider } from '../../clients/eth_provider'
import { ethers } from 'forta-agent'
import { Finding } from '../../generated/proto/alert_pb'
import { getFortaConfig } from 'forta-agent/dist/sdk/utils'
import { EtherscanProviderMock } from '../../clients/mocks/mock'
import promClient from 'prom-client'
import { Metrics } from '../../utils/metrics/metrics'

const TEST_TIMEOUT = 120_000 // ms

describe('GateSeal srv functional tests', () => {
  const chainId = 1

  const logger: Winston.Logger = Winston.createLogger({
    format: Winston.format.simple(),
    transports: [new Winston.transports.Console()],
  })

  const adr: Address = Address

  const fortaEthersProvider = new ethers.providers.JsonRpcProvider(getFortaConfig().jsonRpcUrl, chainId)
  const lidoRunner = Lido__factory.connect(adr.LIDO_STETH_ADDRESS, fortaEthersProvider)
  const wdQueueRunner = WithdrawalQueueERC721__factory.connect(adr.WITHDRAWALS_QUEUE_ADDRESS, fortaEthersProvider)
  const gateSealRunner = GateSeal__factory.connect(adr.GATE_SEAL_DEFAULT_ADDRESS, fortaEthersProvider)
  const veboRunner = ValidatorsExitBusOracle__factory.connect(adr.EXIT_BUS_ORACLE_ADDRESS, fortaEthersProvider)

  const registry = new promClient.Registry()
  const m = new Metrics(registry, 'test_')

  const gateSealClient: IGateSealClient = new ETHProvider(
    logger,
    m,
    fortaEthersProvider,
    EtherscanProviderMock(),
    lidoRunner,
    wdQueueRunner,
    gateSealRunner,
    veboRunner,
  )

  const gateSealSrv = new GateSealSrv(
    logger,
    gateSealClient,
    new GateSealCache(),
    GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024,
    adr.GATE_SEAL_FACTORY_ADDRESS,
  )

  test(
    'handle pause role true',
    async () => {
      const blockNumber = 19_113_580
      const block = await fortaEthersProvider.getBlock(blockNumber)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }

      const initErr = await gateSealSrv.initialize(blockNumber)
      if (initErr instanceof Error) {
        throw initErr
      }

      const status = await gateSealClient.checkGateSeal(blockNumber, GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024)
      if (E.isLeft(status)) {
        throw status
      }

      const expected: GateSeal = {
        roleForWithdrawalQueue: true,
        roleForExitBus: true,
        exitBusOracleAddress: '0x0de4ea0184c2ad0baca7183356aea5b8d5bf5c6e',
        withdrawalQueueAddress: '0x889edc2edab5f40e902b864ad4d7ade8e412f9b1',
      }
      expect(status.right).toEqual(expected)

      const result = await gateSealSrv.handlePauseRole(blockDto)

      expect(result.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )

  test(
    '⚠️ GateSeal: is about to be expired',
    async () => {
      const initBlock = 19_172_614

      const initErr = await gateSealSrv.initialize(initBlock)
      if (initErr instanceof Error) {
        throw initErr
      }

      const neededBlock = 19_172_615
      const block = await fortaEthersProvider.getBlock(neededBlock)
      const blockDto: BlockDto = {
        number: block.number,
        timestamp: block.timestamp,
        parentHash: block.parentHash,
        hash: block.hash,
      }
      const result = await gateSealSrv.handleExpiryGateSeal(blockDto)

      const expected = {
        alertId: 'GATE-SEAL-IS-ABOUT-TO-BE-EXPIRED',
        description:
          `GateSeal address: [${GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024}](https://etherscan.io/address/${GATE_SEAL_DEFAULT_ADDRESS_BEFORE_26_APR_2024})\n` +
          'Expiry date Wed, 01 May 2024 00:00:00 GMT',
        name: '⚠️ GateSeal: is about to be expired',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.DEGRADED,
      }

      expect(result.length).toEqual(1)
      expect(result[0].getAlertid()).toEqual(expected.alertId)
      expect(result[0].getDescription()).toEqual(expected.description)
      expect(result[0].getName()).toEqual(expected.name)
      expect(result[0].getSeverity()).toEqual(expected.severity)
      expect(result[0].getType()).toEqual(expected.type)
    },
    TEST_TIMEOUT,
  )

  test(
    '⚠️ GateSeal: a new instance deployed from factory',
    async () => {
      const txHash = '0x1547f17108830a92673b967aff13971fae18b4d35681b93a38a97a22083deb93'
      const trx = await fortaEthersProvider.getTransaction(txHash)
      const receipt = await trx.wait()

      const transactionDto: TransactionDto = {
        logs: receipt.logs,
        to: trx.to ? trx.to : null,
        block: {
          timestamp: trx.timestamp ? trx.timestamp : new Date().getTime(),
          number: trx.blockNumber ? trx.blockNumber : 1,
        },
      }

      const results = gateSealSrv.handleTransaction(transactionDto)

      const expected = {
        alertId: 'GATE-SEAL-NEW-ONE-CREATED',
        description:
          'New instance address: [0x79243345eDbe01A7E42EDfF5900156700d22611c](https://etherscan.io/address/0x79243345eDbe01A7E42EDfF5900156700d22611c)\n' +
          'dev: Please, check if `GATE_SEAL_DEFAULT_ADDRESS` should be updated in the nearest future',
        name: '⚠️ GateSeal: a new instance deployed from factory',
        severity: Finding.Severity.MEDIUM,
        type: Finding.FindingType.INFORMATION,
      }

      expect(results.length).toEqual(1)
      expect(results[0].getAlertid()).toEqual(expected.alertId)
      expect(results[0].getDescription()).toEqual(expected.description)
      expect(results[0].getName()).toEqual(expected.name)
      expect(results[0].getSeverity()).toEqual(expected.severity)
      expect(results[0].getType()).toEqual(expected.type)

      const txHashEmptyFindings = '0xb00783f3eb79bd60f63e5744bbf0cb4fdc2f98bbca54cd2d3f611f032faa6a57'

      const trxWithEmptyFindings = await fortaEthersProvider.getTransaction(txHashEmptyFindings)
      const receiptWithEmptyFindings = await trxWithEmptyFindings.wait()

      const trxDTOWithEmptyFindings: TransactionDto = {
        logs: receiptWithEmptyFindings.logs,
        to: trxWithEmptyFindings.to ? trxWithEmptyFindings.to : null,
        block: {
          timestamp: trxWithEmptyFindings.timestamp ? trxWithEmptyFindings.timestamp : new Date().getTime(),
          number: trxWithEmptyFindings.blockNumber ? trxWithEmptyFindings.blockNumber : 1,
        },
      }

      const resultsEmptyFindings = gateSealSrv.handleTransaction(trxDTOWithEmptyFindings)

      expect(resultsEmptyFindings.length).toEqual(0)
    },
    TEST_TIMEOUT,
  )
})
