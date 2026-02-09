import type { Witnesses } from "./managed/counter/contract/index.js";

export type CounterPrivateState = Record<string, never>;

export const createCounterPrivateState = (): CounterPrivateState => ({});

export const counterWitnesses: Witnesses<CounterPrivateState> = {};
