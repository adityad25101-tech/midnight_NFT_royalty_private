import { PrivateNftRoyalty, type NftPrivateState } from '@meshsdk/counter-contract';
import { type Contract } from '@midnight-ntwrk/compact-js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type NftCircuits = Contract.ImpureCircuitId<PrivateNftRoyalty.Contract<NftPrivateState>>;

export const NftPrivateStateId = 'nftPrivateState';

export type NftProviders = MidnightProviders<NftCircuits, typeof NftPrivateStateId, NftPrivateState>;

export type NftContract = PrivateNftRoyalty.Contract<NftPrivateState>;

export type DeployedNftContract = DeployedContract<NftContract> | FoundContract<NftContract>;

export type UserAction = {
  mint: string | undefined;
  transfer: string | undefined;
  getOwner: string | undefined;
  getCreator: string | undefined;
};

export type DerivedState = {
  readonly ledgerState: PrivateNftRoyalty.Ledger;
  readonly privateState: NftPrivateState;
  readonly turns: UserAction;
};

export const emptyState: DerivedState = {
  ledgerState: {
    next_token_id: 0n,
    nft_owner: new Map(),
    nft_creator: new Map(),
  } as unknown as PrivateNftRoyalty.Ledger,
  privateState: { royaltyPct: 0n },
  turns: { mint: undefined, transfer: undefined, getOwner: undefined, getCreator: undefined },
};
