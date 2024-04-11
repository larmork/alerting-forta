import { BlockDto } from '../entity/blockDto'
import { IBaseClient } from './base_client'
import { Log } from '@ethersproject/abstract-provider'
import { Finding } from 'forta-agent'
import * as E from 'fp-ts/Either'
import { Logger } from 'winston'
import { elapsedTime } from '../utils/time'
import { networkAlert } from '../utils/finding.helpers'

export class BlockClient {
  private provider: IBaseClient
  private logger: Logger
  private cachedBlockDto: BlockDto | undefined = undefined

  constructor(provider: IBaseClient, logger: Logger) {
    this.provider = provider
    this.logger = logger
  }

  public async getL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const start = new Date().getTime()
    const blocks = await this.fetchL2Blocks()
    this.logger.info(elapsedTime(BlockClient.name + '.' + this.getL2Blocks.name, start))

    return blocks
  }

  public async getL2Logs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const start = new Date().getTime()
    const logs = await this.fetchL2Logs(workingBlocks)
    this.logger.info(elapsedTime(BlockClient.name + '.' + this.getL2Logs.name, start))

    return logs
  }

  private async fetchL2Blocks(): Promise<E.Either<Finding, BlockDto[]>> {
    const out: BlockDto[] = []

    if (this.cachedBlockDto === undefined) {
      const block = await this.provider.getLatestL2Block()
      if (E.isLeft(block)) {
        return E.left(
          networkAlert(
            block.left,
            `Error in ${BlockClient.name}.${this.getL2Blocks.name}:40`,
            `Could not call provider.getLatestBlock`,
            0,
          ),
        )
      }

      this.cachedBlockDto = {
        number: block.right.number,
        timestamp: block.right.timestamp,
      }

      out.push(this.cachedBlockDto)
    } else {
      const latestBlock = await this.provider.getLatestL2Block()
      if (E.isLeft(latestBlock)) {
        this.cachedBlockDto = undefined
        return E.left(
          networkAlert(
            latestBlock.left,
            `Error in ${BlockClient.name}.${this.getL2Blocks.name}:59`,
            `Could not call provider.getLatestBlock`,
            0,
          ),
        )
      }

      const blocks = await this.provider.fetchL2Blocks(this.cachedBlockDto.number, latestBlock.right.number - 1)
      for (const block of blocks) {
        out.push({
          number: block.number,
          timestamp: block.timestamp,
        })
      }

      this.cachedBlockDto = {
        number: latestBlock.right.number,
        timestamp: latestBlock.right.timestamp,
      }

      // hint: we requested blocks like [cachedBlockDto.number, latestBlock.number)
      // and here we do [cachedBlockDto.number, latestBlock.number]
      out.push({
        number: latestBlock.right.number,
        timestamp: latestBlock.right.timestamp,
      })
    }

    return E.right(out)
  }

  private async fetchL2Logs(workingBlocks: BlockDto[]): Promise<E.Either<Finding, Log[]>> {
    const logs = await this.provider.getL2Logs(workingBlocks[0].number, workingBlocks[workingBlocks.length - 1].number)
    if (E.isLeft(logs)) {
      return E.left(
        networkAlert(
          logs.left,
          `Error in ${BlockClient.name}.${this.getL2Logs.name}:76`,
          `Could not call provider.getLogs`,
          workingBlocks[workingBlocks.length - 1].number,
        ),
      )
    }

    return E.right(logs.right)
  }
}
