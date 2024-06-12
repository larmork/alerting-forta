import { EasyTrackSrv } from './EasyTrack.srv'
import { LogDescription, TransactionEvent } from 'forta-agent'
import { Logger } from 'winston'
import { IEasyTrackClient, INodeOperatorInfo } from './contract'
import * as E from 'fp-ts/Either'
import {
  EASY_TRACK_ADDRESS,
  INCREASE_STAKING_LIMIT_ADDRESS as increaseStakingLimitAddress,
} from '../../shared/constants/common/mainnet'
import BigNumber from 'bignumber.js'
import { STONKS_STETH_DAI_ADDRESS, STONKS_ALLOWED_RECIPIENT_ADDRESS } from '../../shared/constants/stonks/mainnet'
import { TopUpAllowedRecipients__factory } from '../../generated'
import { ETH_DECIMALS } from '../../shared/constants'
import { TOP_UP_ALLOWED_RECIPIENTS_CONTRACT } from '../../shared/constants/easy-track/mainnet'

describe('EasyTrackSrv', () => {
  let logger: Logger
  let ethProvider: IEasyTrackClient
  let easyTrackSrv: EasyTrackSrv
  let txEvent: TransactionEvent

  beforeEach(() => {
    logger = { info: jest.fn() } as unknown as Logger
    ethProvider = { getNOInfoByMotionData: jest.fn() } as unknown as IEasyTrackClient
    easyTrackSrv = new EasyTrackSrv(logger, ethProvider)
    txEvent = { addresses: { '0x123': true }, filterLog: jest.fn() } as unknown as TransactionEvent
  })

  it('initializes without error', () => {
    expect(() => easyTrackSrv.initialize(100)).not.toThrow()
  })

  it('returns the correct name', () => {
    expect(easyTrackSrv.getName()).toBe('EasyTrack')
  })

  it('handles EasyTrack motion created without error when no EasyTrack address in transaction', async () => {
    const findings = await easyTrackSrv.handleTransaction(txEvent)

    expect(findings).toEqual([])
  })

  it.each([
    {
      name: 'New motion created',
      evmFactoryAddress: '0x123',
      totalSigningKeys: BigNumber(100),
      stakingLimit: BigNumber(50),
      expectedName: 'ℹ️ EasyTrack: New motion created',
      expectedDescription: 'New  motion [1](https://easytrack.lido.fi/motions/1) created by 0x123',
    },
    {
      name: 'Increase node operator staking limit motion',
      evmFactoryAddress: increaseStakingLimitAddress,
      totalSigningKeys: BigNumber(100),
      stakingLimit: BigNumber(50),
      expectedName: 'ℹ️ EasyTrack: New motion created',
      expectedDescription:
        'Increase node operator staking limit motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nOperator Test wants to increase staking limit to **50**.\nNo issues with keys! ✅',
    },
    {
      name: 'Increase node operator staking limit motion - not enough keys',
      evmFactoryAddress: increaseStakingLimitAddress,
      totalSigningKeys: BigNumber(50),
      stakingLimit: BigNumber(100),
      expectedName: '⚠️️ EasyTrack: New motion created',
      expectedDescription:
        'Increase node operator staking limit motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nOperator Test wants to increase staking limit to **100**.\nBut operator has not enough keys uploaded! ⚠️\nRequired: 100\nAvailable: 50',
    },
  ])(
    'handles EasyTrack motion - $name',
    async ({ evmFactoryAddress, totalSigningKeys, stakingLimit, expectedName, expectedDescription }) => {
      txEvent.addresses[EASY_TRACK_ADDRESS] = true
      jest.mocked(txEvent.filterLog).mockReturnValue([
        {
          args: {
            _evmScriptFactory: evmFactoryAddress,
            _motionId: '1',
            _creator: '0x123',
            _evmScriptCallData: '0x123',
          },
        } as unknown as LogDescription,
      ])
      jest.spyOn(ethProvider, 'getNOInfoByMotionData').mockResolvedValue(
        E.right({
          name: 'Test',
          totalSigningKeys: totalSigningKeys,
          stakingLimit: stakingLimit,
        } as unknown as INodeOperatorInfo),
      )

      const findings = await easyTrackSrv.handleEasyTrackMotionCreated(txEvent)

      expect(findings).toHaveLength(1)
      expect(findings[0].name).toBe(expectedName)
      expect(findings[0].description).toBe(expectedDescription)
      expect(findings[0].alertId).toBe('EASY-TRACK-MOTION-CREATED')
    },
  )

  it('handles EasyTrack motion - Stonks topup', async () => {
    TopUpAllowedRecipients__factory.connect = jest.fn().mockReturnValue({
      decodeEVMScriptCallData: jest.fn().mockResolvedValue({
        recipients: [STONKS_STETH_DAI_ADDRESS],
        amounts: [ETH_DECIMALS.multipliedBy(100).toString()],
      }),
    } as unknown as TopUpAllowedRecipients__factory)

    txEvent.addresses[EASY_TRACK_ADDRESS] = true
    jest.mocked(txEvent.filterLog).mockReturnValue([
      {
        args: {
          _evmScriptFactory: STONKS_ALLOWED_RECIPIENT_ADDRESS,
          _motionId: '1',
          _creator: '0x123',
          _evmScriptCallData: '0x123',
        },
      } as unknown as LogDescription,
    ])

    const findings = await easyTrackSrv.handleEasyTrackMotionCreated(txEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0].name).toBe('ℹ️ EasyTrack: New motion created')
    expect(findings[0].description).toBe(
      'New  motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nTop up STONKS:\n[stETH -> DAI](https://etherscan.io/address/0x3e2D251275A92a8169A3B17A2C49016e2de492a7) pair with 100.00 stETH',
    )
    expect(findings[0].alertId).toBe('EASY-TRACK-MOTION-CREATED')
  })

  it('handles EasyTrack motion - Single allowed recipient topup', async () => {
    ethProvider.getTokenSymbol = jest.fn().mockResolvedValue(E.right('stETH'))
    const rccAddress = '0xde06d17db9295fa8c4082d4f73ff81592a3ac437'
    TopUpAllowedRecipients__factory.connect = jest.fn().mockReturnValue({
      decodeEVMScriptCallData: jest.fn().mockResolvedValue({
        recipients: [rccAddress],
        amounts: [ETH_DECIMALS.multipliedBy(100).toString()],
      }),
      token: jest.fn().mockResolvedValue('0x123'),
    } as unknown as TopUpAllowedRecipients__factory)
    txEvent.addresses[EASY_TRACK_ADDRESS] = true
    jest.mocked(txEvent.filterLog).mockReturnValue([
      {
        args: {
          _evmScriptFactory: TOP_UP_ALLOWED_RECIPIENTS_CONTRACT,
          _motionId: '1',
          _creator: '0x123',
          _evmScriptCallData: '0x123',
        },
      } as unknown as LogDescription,
    ])

    const findings = await easyTrackSrv.handleEasyTrackMotionCreated(txEvent)

    expect(findings).toHaveLength(1)
    expect(findings[0].name).toBe('ℹ️ EasyTrack: New motion created')
    expect(findings[0].description).toBe(
      'New  motion [1](https://easytrack.lido.fi/motions/1) created by 0x123\nTop up allowed recipient Resourcing and Compensation Committee (RCC) for [0xde06d17db9295fa8c4082d4f73ff81592a3ac437](https://etherscan.io/address/0xde06d17db9295fa8c4082d4f73ff81592a3ac437) with 100.00 stETH',
    )
    expect(findings[0].alertId).toBe('EASY-TRACK-MOTION-CREATED')
  })
})
