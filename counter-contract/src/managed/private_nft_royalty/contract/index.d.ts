import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  set_royalty(context: __compactRuntime.WitnessContext<Ledger, PS>,
              pct_0: bigint): [PS, []];
}

export type ImpureCircuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       token_id_0: Uint8Array,
       creator_0: Uint8Array,
       secret_royalty_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           token_id_0: Uint8Array,
           sender_0: Uint8Array,
           receiver_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  get_owner(context: __compactRuntime.CircuitContext<PS>, token_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  get_creator(context: __compactRuntime.CircuitContext<PS>,
              token_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type PureCircuits = {
}

export type Circuits<PS> = {
  mint(context: __compactRuntime.CircuitContext<PS>,
       token_id_0: Uint8Array,
       creator_0: Uint8Array,
       secret_royalty_0: bigint): __compactRuntime.CircuitResults<PS, []>;
  transfer(context: __compactRuntime.CircuitContext<PS>,
           token_id_0: Uint8Array,
           sender_0: Uint8Array,
           receiver_0: Uint8Array): __compactRuntime.CircuitResults<PS, []>;
  get_owner(context: __compactRuntime.CircuitContext<PS>, token_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
  get_creator(context: __compactRuntime.CircuitContext<PS>,
              token_id_0: Uint8Array): __compactRuntime.CircuitResults<PS, Uint8Array>;
}

export type Ledger = {
  readonly next_token_id: bigint;
  nft_owner: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
  nft_creator: {
    isEmpty(): boolean;
    size(): bigint;
    member(key_0: Uint8Array): boolean;
    lookup(key_0: Uint8Array): Uint8Array;
    [Symbol.iterator](): Iterator<[Uint8Array, Uint8Array]>
  };
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
