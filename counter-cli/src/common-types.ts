import { PrivateNftRoyalty, type NftPrivateState } from '@meshsdk/counter-contract';
import { type Contract } from '@midnight-ntwrk/compact-js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

// NFT contract types
export type NftCircuits = Contract.ImpureCircuitId<PrivateNftRoyalty.Contract<NftPrivateState>>;

export const NftPrivateStateId = 'nftPrivateState';

export type NftProviders = MidnightProviders<NftCircuits, typeof NftPrivateStateId, NftPrivateState>;

export type NftContract = PrivateNftRoyalty.Contract<NftPrivateState>;

export type DeployedNftContract = DeployedContract<NftContract> | FoundContract<NftContract>;
