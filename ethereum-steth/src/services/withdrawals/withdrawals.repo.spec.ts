import { WithdrawalRequest } from '../../entity/withdrawal_request'
import BigNumber from 'bignumber.js'
import { faker } from '@faker-js/faker'
import { NotFound, WithdrawalsRepo } from './Withdrawals.repo'
import { either as E } from 'fp-ts'
import { Config } from '../../utils/env/env'
import { knex } from 'knex'

const timeout = 120_000

describe('Withdrawals repo tests', () => {
  const dbClient = knex(Config.getKnexConfig())
  const repo = new WithdrawalsRepo(dbClient)

  const requests: WithdrawalRequest[] = [
    new WithdrawalRequest(
      1,
      new BigNumber('40289303816004547510'),
      new BigNumber(faker.number.bigInt().toString()),
      faker.string.hexadecimal(),
      faker.date.past().getTime(),
      true,
      true,
    ),
    new WithdrawalRequest(
      2,
      new BigNumber(faker.number.bigInt().toString()),
      new BigNumber(faker.number.bigInt().toString()),
      faker.string.hexadecimal(),
      faker.date.past().getTime(),
      true,
      false,
    ),
    new WithdrawalRequest(
      3,
      new BigNumber(faker.number.bigInt().toString()),
      new BigNumber(faker.number.bigInt().toString()),
      faker.string.hexadecimal(),
      faker.date.past().getTime(),
      true,
      false,
    ),
    new WithdrawalRequest(
      4,
      new BigNumber(faker.number.bigInt().toString()),
      new BigNumber(faker.number.bigInt().toString()),
      faker.string.hexadecimal(),
      faker.date.past().getTime(),
      true,
      false,
    ),
  ]

  beforeAll(async () => {
    await dbClient.migrate.down()
    await dbClient.migrate.latest()

    const err = await repo.createOrUpdate(requests)
    if (err !== null) {
      throw err
    }
  })

  afterAll(async () => {
    await dbClient.destroy()
  })

  test(
    'createOrUpdate should insert data',
    async () => {
      const r = await repo.getById(1)
      if (E.isLeft(r)) {
        throw r.left
      }

      expect(r.right).toEqual(requests[0])
    },
    timeout,
  )

  test(
    'getUnclaimedReqIds success',
    async () => {
      const r = await repo.getUnclaimedReqIds()
      if (E.isLeft(r)) {
        throw r.left
      }

      expect(r.right.length).toEqual(3)
    },
    timeout,
  )

  test(
    'removeByIds success',
    async () => {
      const requestForDelete = 3
      const r = await repo.removeByIds([requestForDelete])
      if (r !== null) {
        throw r
      }

      const deleted = await repo.getById(requestForDelete)
      if (E.isRight(deleted)) {
        throw new Error('Object must be deleted')
      }

      expect(deleted.left).toEqual(NotFound)
    },
    timeout,
  )

  test(
    'update success',
    async () => {
      const requestForUpdate = 4
      const wr = new WithdrawalRequest(
        requestForUpdate,
        new BigNumber(1),
        new BigNumber(1),
        faker.string.hexadecimal(),
        faker.date.past().getTime(),
        true,
        true,
      )

      const updErr = await repo.createOrUpdate([wr])
      if (updErr) {
        throw new Error('Object must be updated')
      }

      const r = await repo.getById(requestForUpdate)
      if (E.isLeft(r)) {
        throw new Error('Object must be exist')
      }

      expect(r.right).toEqual(wr)
    },
    timeout,
  )
})
