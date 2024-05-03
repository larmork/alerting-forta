import { StethOperationSrv } from './services/steth_operation/StethOperation.srv'
import { ethers, Finding, getEthersProvider } from 'forta-agent'
import { Address } from './utils/constants'
import { StethOperationCache } from './services/steth_operation/StethOperation.cache'
import { ETHProvider } from './clients/eth_provider'
import { FormatterWithEIP1898 } from './clients/eth_formatter'
import {
  GateSeal__factory,
  Lido__factory,
  ValidatorsExitBusOracle__factory,
  WithdrawalQueueERC721__factory,
} from './generated/typechain'
import { getDepositSecurityEvents } from './utils/events/deposit_security_events'
import { getLidoEvents } from './utils/events/lido_events'
import { getInsuranceFundEvents } from './utils/events/insurance_fund_events'
import { getBurnerEvents } from './utils/events/burner_events'
import { WithdrawalsSrv } from './services/withdrawals/Withdrawals.srv'
import { WithdrawalsCache } from './services/withdrawals/Withdrawals.cache'
import { getWithdrawalsEvents } from './utils/events/withdrawals_events'
import { GateSealSrv } from './services/gate-seal/GateSeal.srv'
import { DataRW } from './utils/mutex'
import { GateSealCache } from './services/gate-seal/GateSeal.cache'
import * as Winston from 'winston'
import { VaultSrv } from './services/vault/Vault.srv'
import { Knex, knex } from 'knex'
import { WithdrawalsRepo } from './services/withdrawals/Withdrawals.repo'
import { BorderTime, HealthChecker, MaxNumberErrorsPerBorderTime } from './services/health-checker/health-checker.srv'
import promClient from 'prom-client'

export type Container = {
  db: Knex
  logger: Winston.Logger
  prometheus: promClient.Registry
  ethClient: ETHProvider
  StethOperationSrv: StethOperationSrv
  WithdrawalsSrv: WithdrawalsSrv
  GateSealSrv: GateSealSrv
  VaultSrv: VaultSrv
  findingsRW: DataRW<Finding>
  healthChecker: HealthChecker
}

export class App {
  private static instance: Container

  private constructor() {}
  private static getConnection(): Knex {
    const config: knex.Knex.Config = {
      client: 'sqlite3',
      connection: {
        filename: ':memory:',
        // filename: '/tmp/dbdatabase.db',
      },
      migrations: {
        tableName: 'knex_migrations',
        directory: './src/db/migrations',
      },
      useNullAsDefault: false,
    }

    return knex(config)
  }

  public static async getInstance(rpcUrl?: string): Promise<Container> {
    if (!App.instance) {
      const db = App.getConnection()

      const drpcURL = `https://eth.drpc.org`
      const mainnet = 1
      const drpcProvider = new ethers.providers.JsonRpcProvider(drpcURL, mainnet)

      const etherscanKey = Buffer.from('SVZCSjZUSVBXWUpZSllXSVM0SVJBSlcyNjRITkFUUjZHVQ==', 'base64').toString('utf-8')
      let ethersProvider = getEthersProvider()
      if (rpcUrl !== undefined) {
        ethersProvider = drpcProvider
      }
      ethersProvider.formatter = new FormatterWithEIP1898()

      const etherscanProvider = new ethers.providers.EtherscanProvider(ethersProvider.network, etherscanKey)

      const address: Address = Address

      const lidoRunner = Lido__factory.connect(address.LIDO_STETH_ADDRESS, ethersProvider)

      const wdQueueRunner = WithdrawalQueueERC721__factory.connect(address.WITHDRAWALS_QUEUE_ADDRESS, drpcProvider)

      const gateSealRunner = GateSeal__factory.connect(address.GATE_SEAL_DEFAULT_ADDRESS, ethersProvider)
      const veboRunner = ValidatorsExitBusOracle__factory.connect(address.EXIT_BUS_ORACLE_ADDRESS, ethersProvider)

      const logger: Winston.Logger = Winston.createLogger({
        format: Winston.format.simple(),
        transports: [new Winston.transports.Console()],
      })

      const ethClient = new ETHProvider(
        logger,
        ethersProvider,
        etherscanProvider,
        lidoRunner,
        wdQueueRunner,
        gateSealRunner,
        veboRunner,
      )

      const stethOperationCache = new StethOperationCache()
      const stethOperationSrv = new StethOperationSrv(
        logger,
        stethOperationCache,
        ethClient,
        address.DEPOSIT_SECURITY_ADDRESS,
        address.LIDO_STETH_ADDRESS,
        address.DEPOSIT_EXECUTOR_ADDRESS,
        getDepositSecurityEvents(address.DEPOSIT_SECURITY_ADDRESS),
        getLidoEvents(address.LIDO_STETH_ADDRESS),
        getInsuranceFundEvents(address.INSURANCE_FUND_ADDRESS, address.KNOWN_ERC20),
        getBurnerEvents(address.BURNER_ADDRESS),
      )

      const withdrawalsSrv = new WithdrawalsSrv(
        logger,
        new WithdrawalsRepo(db),
        ethClient,
        new WithdrawalsCache(),
        getWithdrawalsEvents(address.WITHDRAWALS_QUEUE_ADDRESS),
        address.WITHDRAWALS_QUEUE_ADDRESS,
        address.LIDO_STETH_ADDRESS,
      )

      const gateSealSrv = new GateSealSrv(
        logger,
        ethClient,
        new GateSealCache(),
        address.GATE_SEAL_DEFAULT_ADDRESS,
        address.GATE_SEAL_FACTORY_ADDRESS,
      )

      const drpcClient = new ETHProvider(
        logger,
        drpcProvider,
        etherscanProvider,
        lidoRunner,
        wdQueueRunner,
        gateSealRunner,
        veboRunner,
      )

      const vaultSrv = new VaultSrv(
        logger,
        drpcClient,
        address.WITHDRAWALS_VAULT_ADDRESS,
        address.EL_REWARDS_VAULT_ADDRESS,
        address.BURNER_ADDRESS,
        address.LIDO_STETH_ADDRESS,
      )

      const m = promClient
      m.collectDefaultMetrics({
        prefix: 'ethereum_steth_',
      })

      App.instance = {
        logger: logger,
        prometheus: m.register,
        ethClient: ethClient,
        StethOperationSrv: stethOperationSrv,
        WithdrawalsSrv: withdrawalsSrv,
        GateSealSrv: gateSealSrv,
        VaultSrv: vaultSrv,
        findingsRW: new DataRW([]),
        db: db,
        healthChecker: new HealthChecker(BorderTime, MaxNumberErrorsPerBorderTime),
      }
    }

    return App.instance
  }
}
