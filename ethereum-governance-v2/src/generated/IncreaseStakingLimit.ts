/* Autogenerated file. Do not edit manually. */
/* tslint:disable */
/* eslint-disable */
import type { BaseContract, BigNumber, BytesLike, CallOverrides, PopulatedTransaction, Signer, utils } from 'ethers'
import type { FunctionFragment, Result } from '@ethersproject/abi'
import type { Listener, Provider } from '@ethersproject/providers'
import type { TypedEventFilter, TypedEvent, TypedListener, OnEvent } from './common'

export interface IncreaseStakingLimitInterface extends utils.Interface {
  functions: {
    'createEVMScript(address,bytes)': FunctionFragment
    'decodeEVMScriptCallData(bytes)': FunctionFragment
    'nodeOperatorsRegistry()': FunctionFragment
  }

  getFunction(
    nameOrSignatureOrTopic: 'createEVMScript' | 'decodeEVMScriptCallData' | 'nodeOperatorsRegistry',
  ): FunctionFragment

  encodeFunctionData(functionFragment: 'createEVMScript', values: [string, BytesLike]): string
  encodeFunctionData(functionFragment: 'decodeEVMScriptCallData', values: [BytesLike]): string
  encodeFunctionData(functionFragment: 'nodeOperatorsRegistry', values?: undefined): string

  decodeFunctionResult(functionFragment: 'createEVMScript', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'decodeEVMScriptCallData', data: BytesLike): Result
  decodeFunctionResult(functionFragment: 'nodeOperatorsRegistry', data: BytesLike): Result

  events: {}
}

export interface IncreaseStakingLimit extends BaseContract {
  connect(signerOrProvider: Signer | Provider | string): this
  attach(addressOrName: string): this
  deployed(): Promise<this>

  interface: IncreaseStakingLimitInterface

  queryFilter<TEvent extends TypedEvent>(
    event: TypedEventFilter<TEvent>,
    fromBlockOrBlockhash?: string | number | undefined,
    toBlock?: string | number | undefined,
  ): Promise<Array<TEvent>>

  listeners<TEvent extends TypedEvent>(eventFilter?: TypedEventFilter<TEvent>): Array<TypedListener<TEvent>>
  listeners(eventName?: string): Array<Listener>
  removeAllListeners<TEvent extends TypedEvent>(eventFilter: TypedEventFilter<TEvent>): this
  removeAllListeners(eventName?: string): this
  off: OnEvent<this>
  on: OnEvent<this>
  once: OnEvent<this>
  removeListener: OnEvent<this>

  functions: {
    createEVMScript(_creator: string, _evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<[string]>

    decodeEVMScriptCallData(
      _evmScriptCallData: BytesLike,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber] & {
        _nodeOperatorId: BigNumber
        _stakingLimit: BigNumber
      }
    >

    nodeOperatorsRegistry(overrides?: CallOverrides): Promise<[string]>
  }

  createEVMScript(_creator: string, _evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<string>

  decodeEVMScriptCallData(
    _evmScriptCallData: BytesLike,
    overrides?: CallOverrides,
  ): Promise<
    [BigNumber, BigNumber] & {
      _nodeOperatorId: BigNumber
      _stakingLimit: BigNumber
    }
  >

  nodeOperatorsRegistry(overrides?: CallOverrides): Promise<string>

  callStatic: {
    createEVMScript(_creator: string, _evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<string>

    decodeEVMScriptCallData(
      _evmScriptCallData: BytesLike,
      overrides?: CallOverrides,
    ): Promise<
      [BigNumber, BigNumber] & {
        _nodeOperatorId: BigNumber
        _stakingLimit: BigNumber
      }
    >

    nodeOperatorsRegistry(overrides?: CallOverrides): Promise<string>
  }

  filters: {}

  estimateGas: {
    createEVMScript(_creator: string, _evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<BigNumber>

    decodeEVMScriptCallData(_evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<BigNumber>

    nodeOperatorsRegistry(overrides?: CallOverrides): Promise<BigNumber>
  }

  populateTransaction: {
    createEVMScript(
      _creator: string,
      _evmScriptCallData: BytesLike,
      overrides?: CallOverrides,
    ): Promise<PopulatedTransaction>

    decodeEVMScriptCallData(_evmScriptCallData: BytesLike, overrides?: CallOverrides): Promise<PopulatedTransaction>

    nodeOperatorsRegistry(overrides?: CallOverrides): Promise<PopulatedTransaction>
  }
}
