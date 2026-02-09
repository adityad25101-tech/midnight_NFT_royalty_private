import { Counter, type CounterPrivateState } from '@meshsdk/counter-contract';
import { type Contract } from '@midnight-ntwrk/compact-js';
import type { MidnightProviders } from '@midnight-ntwrk/midnight-js-types';
import type { DeployedContract, FoundContract } from '@midnight-ntwrk/midnight-js-contracts';

export type CounterCircuits = Contract.ImpureCircuitId<Counter.Contract<CounterPrivateState>>;

export const CounterPrivateStateId = 'counterPrivateState';

export type CounterProviders = MidnightProviders<CounterCircuits, typeof CounterPrivateStateId, CounterPrivateState>;

export type CounterContract = Counter.Contract<CounterPrivateState>;

export type DeployedCounterContract = DeployedContract<CounterContract> | FoundContract<CounterContract>;

export type UserAction = {
  increment: string | undefined;
};

export type DerivedState = {
  readonly ledgerState: Counter.Ledger;
  readonly privateState: CounterPrivateState;
  readonly turns: UserAction;
};

export const emptyState: DerivedState = {
  ledgerState: {
    round: 0n,
  } as unknown as Counter.Ledger,
  privateState: {},
  turns: { increment: undefined },
};
