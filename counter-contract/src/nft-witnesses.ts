import type { Witnesses, Ledger } from "./managed/private_nft_royalty/contract/index.js";
import type { WitnessContext } from "@midnight-ntwrk/compact-runtime";

export type NftPrivateState = {
  royaltyPct: bigint;
};

export const createNftPrivateState = (royaltyPct: bigint): NftPrivateState => ({
  royaltyPct,
});

export const nftWitnesses: Witnesses<NftPrivateState> = {
  set_royalty(context: WitnessContext<Ledger, NftPrivateState>, pct: bigint): [NftPrivateState, []] {
    const newState: NftPrivateState = { royaltyPct: pct };
    return [newState, []];
  },
};
