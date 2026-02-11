import { Counter, counterWitnesses, createCounterPrivateState, PrivateNftRoyalty, nftWitnesses, createNftPrivateState } from "./counter-contract/dist/index.js";
console.log("Counter keys:", Object.keys(Counter));
console.log("counterWitnesses:", counterWitnesses);
console.log("createCounterPrivateState:", createCounterPrivateState());
console.log("NFT keys:", Object.keys(PrivateNftRoyalty || {}));
console.log("nftWitnesses:", typeof nftWitnesses);
console.log("createNftPrivateState:", typeof createNftPrivateState);
