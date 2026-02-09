import { type Logger } from 'pino';
import { BehaviorSubject, type Observable } from 'rxjs';
import { pipe } from 'effect';

import {
  type CounterProviders,
  type DeployedCounterContract,
  CounterPrivateStateId,
  type DerivedState,
  type UserAction,
  emptyState,
} from './common-types';
import { Counter, type CounterPrivateState, counterWitnesses, createCounterPrivateState } from '@meshsdk/counter-contract';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export interface ContractControllerInterface {
  readonly state$: Observable<DerivedState>;
  readonly deployedContractAddress: ContractAddress;
  increment(): Promise<void>;
}

const buildCompiledContract = () =>
  pipe(
    CompiledContract.make('Counter', Counter.Contract),
    CompiledContract.withWitnesses(counterWitnesses),
    CompiledContract.withCompiledFileAssets('counter'),
  );

export class ContractController implements ContractControllerInterface {
  private readonly deployedContract: DeployedCounterContract;
  readonly state$: Observable<DerivedState>;
  private readonly turns$: BehaviorSubject<UserAction>;
  readonly deployedContractAddress: ContractAddress;

  private constructor(
    deployedContract: DeployedCounterContract,
    logger?: Logger,
  ) {
    this.deployedContract = deployedContract;
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.turns$ = new BehaviorSubject<UserAction>(emptyState.turns);

    this.state$ = new BehaviorSubject<DerivedState>({
      ledgerState: deployedContract.deployTxData.public.initialContractState as unknown as Counter.Ledger,
      privateState: {},
      turns: emptyState.turns,
    });
    void logger;
  }

  async increment(): Promise<void> {
    this.turns$.next({ ...this.turns$.value, increment: 'Incrementing counter...' });
    try {
      await this.deployedContract.callTx.increment();
      this.turns$.next({ ...this.turns$.value, increment: undefined });
    } catch (e) {
      this.turns$.next({ ...this.turns$.value, increment: undefined });
      throw e;
    }
  }

  static async deploy(
    privateStateId: typeof CounterPrivateStateId,
    providers: CounterProviders,
    logger: Logger,
  ): Promise<ContractController> {
    logger.info('Deploying Counter contract...');
    const compiledContract = buildCompiledContract();
    const deployedContract = await deployContract(providers, {
      privateStateId,
      compiledContract,
      initialPrivateState: await ContractController.getPrivateState(privateStateId, providers.privateStateProvider),
    });
    logger.info('Counter deployed at: ' + deployedContract.deployTxData.public.contractAddress);
    return new ContractController(deployedContract, logger);
  }

  static async join(
    privateStateId: typeof CounterPrivateStateId,
    providers: CounterProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<ContractController> {
    logger.info('Joining counter contract at: ' + contractAddress);
    const compiledContract = buildCompiledContract();
    const deployedContract = await findDeployedContract(providers, {
      contractAddress,
      compiledContract,
      privateStateId,
      initialPrivateState: await ContractController.getPrivateState(privateStateId, providers.privateStateProvider),
    });
    logger.info('Joined counter contract at: ' + contractAddress);
    return new ContractController(deployedContract, logger);
  }

  private static async getPrivateState(
    counterPrivateStateId: typeof CounterPrivateStateId,
    privateStateProvider: PrivateStateProvider<typeof CounterPrivateStateId>,
  ): Promise<CounterPrivateState> {
    const existingPrivateState = await privateStateProvider.get(counterPrivateStateId);
    return (existingPrivateState as CounterPrivateState | null) ?? createCounterPrivateState();
  }
}
