import { type Logger } from 'pino';
import { BehaviorSubject, type Observable } from 'rxjs';
import { pipe } from 'effect';

import {
  type NftProviders,
  type DeployedNftContract,
  NftPrivateStateId,
  type DerivedState,
  type UserAction,
  emptyState,
} from './common-types';
import { PrivateNftRoyalty, type NftPrivateState, nftWitnesses, createNftPrivateState } from '@meshsdk/counter-contract';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { CompiledContract } from '@midnight-ntwrk/compact-js';
import { deployContract, findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import type { PrivateStateProvider } from '@midnight-ntwrk/midnight-js-types';

export interface ContractControllerInterface {
  readonly state$: Observable<DerivedState>;
  readonly deployedContractAddress: ContractAddress;
  mint(tokenId: Uint8Array, creator: Uint8Array, secretRoyalty: bigint): Promise<void>;
  transfer(tokenId: Uint8Array, sender: Uint8Array, receiver: Uint8Array): Promise<void>;
  getOwner(tokenId: Uint8Array): Promise<void>;
  getCreator(tokenId: Uint8Array): Promise<void>;
}

const buildCompiledContract = () =>
  pipe(
    CompiledContract.make('PrivateNftRoyalty', PrivateNftRoyalty.Contract),
    CompiledContract.withWitnesses(nftWitnesses),
    CompiledContract.withCompiledFileAssets('private_nft_royalty'),
  );

export class ContractController implements ContractControllerInterface {
  private readonly deployedContract: DeployedNftContract;
  readonly state$: Observable<DerivedState>;
  private readonly turns$: BehaviorSubject<UserAction>;
  readonly deployedContractAddress: ContractAddress;

  private constructor(
    deployedContract: DeployedNftContract,
    logger?: Logger,
  ) {
    this.deployedContract = deployedContract;
    this.deployedContractAddress = deployedContract.deployTxData.public.contractAddress;
    this.turns$ = new BehaviorSubject<UserAction>(emptyState.turns);

    this.state$ = new BehaviorSubject<DerivedState>({
      ledgerState: deployedContract.deployTxData.public.initialContractState as unknown as PrivateNftRoyalty.Ledger,
      privateState: { royaltyPct: 0n },
      turns: emptyState.turns,
    });
    void logger;
  }

  async mint(tokenId: Uint8Array, creator: Uint8Array, secretRoyalty: bigint): Promise<void> {
    this.turns$.next({ ...this.turns$.value, mint: 'Minting NFT...' });
    try {
      await this.deployedContract.callTx.mint(tokenId, creator, secretRoyalty);
      this.turns$.next({ ...this.turns$.value, mint: undefined });
    } catch (e) {
      this.turns$.next({ ...this.turns$.value, mint: undefined });
      throw e;
    }
  }

  async transfer(tokenId: Uint8Array, sender: Uint8Array, receiver: Uint8Array): Promise<void> {
    this.turns$.next({ ...this.turns$.value, transfer: 'Transferring NFT...' });
    try {
      await this.deployedContract.callTx.transfer(tokenId, sender, receiver);
      this.turns$.next({ ...this.turns$.value, transfer: undefined });
    } catch (e) {
      this.turns$.next({ ...this.turns$.value, transfer: undefined });
      throw e;
    }
  }

  async getOwner(tokenId: Uint8Array): Promise<void> {
    this.turns$.next({ ...this.turns$.value, getOwner: 'Looking up owner...' });
    try {
      await this.deployedContract.callTx.get_owner(tokenId);
      this.turns$.next({ ...this.turns$.value, getOwner: undefined });
    } catch (e) {
      this.turns$.next({ ...this.turns$.value, getOwner: undefined });
      throw e;
    }
  }

  async getCreator(tokenId: Uint8Array): Promise<void> {
    this.turns$.next({ ...this.turns$.value, getCreator: 'Looking up creator...' });
    try {
      await this.deployedContract.callTx.get_creator(tokenId);
      this.turns$.next({ ...this.turns$.value, getCreator: undefined });
    } catch (e) {
      this.turns$.next({ ...this.turns$.value, getCreator: undefined });
      throw e;
    }
  }

  static async deploy(
    privateStateId: typeof NftPrivateStateId,
    providers: NftProviders,
    logger: Logger,
  ): Promise<ContractController> {
    logger.info('Deploying Private NFT Royalty contract...');
    const compiledContract = buildCompiledContract();
    const deployedContract = await deployContract(providers, {
      privateStateId,
      compiledContract,
      initialPrivateState: await ContractController.getPrivateState(privateStateId, providers.privateStateProvider),
    });
    logger.info('Contract deployed at: ' + deployedContract.deployTxData.public.contractAddress);
    return new ContractController(deployedContract, logger);
  }

  static async join(
    privateStateId: typeof NftPrivateStateId,
    providers: NftProviders,
    contractAddress: ContractAddress,
    logger: Logger,
  ): Promise<ContractController> {
    logger.info('Joining contract at: ' + contractAddress);
    const compiledContract = buildCompiledContract();
    const deployedContract = await findDeployedContract(providers, {
      contractAddress,
      compiledContract,
      privateStateId,
      initialPrivateState: await ContractController.getPrivateState(privateStateId, providers.privateStateProvider),
    });
    logger.info('Joined contract at: ' + contractAddress);
    return new ContractController(deployedContract, logger);
  }

  private static async getPrivateState(
    nftPrivateStateId: typeof NftPrivateStateId,
    privateStateProvider: PrivateStateProvider<typeof NftPrivateStateId>,
  ): Promise<NftPrivateState> {
    const existingPrivateState = await privateStateProvider.get(nftPrivateStateId);
    return (existingPrivateState as NftPrivateState | null) ?? createNftPrivateState(0n);
  }
}
