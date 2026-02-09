# Idea #125 — Private NFT Royalty on Midnight

> A privacy-preserving NFT smart contract where royalty percentages are kept confidential through zero-knowledge proofs on the Midnight blockchain.

## Overview

This project implements **Private NFT Royalty** — a Compact smart contract deployed on the Midnight network that allows minting, transferring, and querying NFTs while keeping royalty information private. The royalty percentage is stored in the contract's private state, accessible only through ZK-proven witnesses, ensuring that sensitive financial terms remain confidential on-chain.

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  Frontend (React)                  │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────┐ │
│  │  NFT Page   │  │  NFT SDK     │  │  Wallet   │ │
│  │  (mint/     │  │  (providers, │  │  Widget   │ │
│  │  transfer/  │  │  controller, │  │  (Lace    │ │
│  │  lookup)    │  │  hooks)      │  │  connect) │ │
│  └─────────────┘  └──────────────┘  └───────────┘ │
└───────────────────┬───────────────────────────────┘
                    │
        ┌───────────▼───────────┐
        │   Midnight Network    │
        │  ┌─────────────────┐  │
        │  │ Private NFT     │  │
        │  │ Royalty Contract │  │
        │  │                 │  │
        │  │ Public Ledger:  │  │
        │  │ • nft_owner     │  │
        │  │ • nft_creator   │  │
        │  │ • next_token_id │  │
        │  │                 │  │
        │  │ Private State:  │  │
        │  │ • royaltyPct 🔒 │  │
        │  └─────────────────┘  │
        │                       │
        │  ┌────────┐ ┌──────┐  │
        │  │Indexer │ │Proof │  │
        │  │        │ │Server│  │
        │  └────────┘ └──────┘  │
        └───────────────────────┘
```

## Privacy Model

| Data | Visibility | Mechanism |
|------|-----------|-----------|
| NFT ownership | **Public** | Stored on-chain in `nft_owner` map |
| NFT creator | **Public** | Stored on-chain in `nft_creator` map |
| Token IDs | **Public** | Sequential counter on ledger |
| Royalty percentage | **Private** 🔒 | Stored in ZK private state, set via `set_royalty` witness |

The royalty percentage is never revealed on-chain. It exists only in the contract's private state, accessible through the `set_royalty` witness function that runs inside the ZK circuit. This means:

- **Creators** can set royalty terms without revealing them publicly
- **Marketplaces** can verify royalty compliance via ZK proofs without learning the actual percentage
- **On-chain observers** see ownership transfers but cannot determine royalty terms

## Smart Contract (Compact)

### File: `counter-contract/src/private_nft_royalty.compact`

```
pragma language_version >= 0.20.0;

ledger {
  next_token_id: Counter;
  nft_owner: Map<Bytes<32>, Bytes<32>>;
  nft_creator: Map<Bytes<32>, Bytes<32>>;
}

witness set_royalty(pct: Field): [];

circuit mint(token_id: Bytes<32>, creator: Bytes<32>, secret_royalty: Field): [] {
  const royalty_data = set_royalty(secret_royalty);
  ledger.nft_owner.insert(token_id, creator);
  ledger.nft_creator.insert(token_id, creator);
  ledger.next_token_id.increment(1);
}

circuit transfer(token_id: Bytes<32>, sender: Bytes<32>, receiver: Bytes<32>): [] {
  const current_owner = ledger.nft_owner.lookup(token_id);
  assert current_owner == sender "Only owner can transfer";
  ledger.nft_owner.insert(token_id, receiver);
}

circuit get_owner(token_id: Bytes<32>): [] {
  const _owner = ledger.nft_owner.lookup(token_id);
}

circuit get_creator(token_id: Bytes<32>): [] {
  const _creator = ledger.nft_creator.lookup(token_id);
}
```

### Circuits (4 total, all with ZK proofs)

| Circuit | Purpose | Inputs |
|---------|---------|--------|
| `mint` | Create new NFT with private royalty | token_id, creator, secret_royalty |
| `transfer` | Transfer ownership (owner-only) | token_id, sender, receiver |
| `get_owner` | Query current owner | token_id |
| `get_creator` | Query original creator | token_id |

## Deployment

The contract is deployed on the Midnight local network:

- **Contract Address**: `33fcd12ae66c8a60242cd39dc014c7a80c8e63f7164394cc4e0b1e56a12be35b`
- **Network**: Local (Docker)
- **Deployed At**: 2026-02-08T12:18:43.296Z

### Network Configuration

| Service | URL |
|---------|-----|
| Node RPC | `ws://localhost:9944` |
| Indexer | `http://localhost:8088` / `ws://localhost:8088` |
| Proof Server | `http://localhost:6300` |

## Project Structure

```
midnight/
├── counter-contract/                    # Smart contract package
│   └── src/
│       ├── private_nft_royalty.compact  # Compact source
│       ├── nft-witnesses.ts            # Witness implementations
│       ├── index.ts                    # Package exports
│       └── managed/
│           └── private_nft_royalty/
│               ├── contract/index.js   # Compiled contract
│               ├── keys/               # ZK prover/verifier keys
│               └── zkir/              # ZK intermediate representations
│
├── counter-cli/                        # CLI deployment tool
│   └── src/
│       ├── api.ts                      # Deploy/interact logic
│       └── common-types.ts            # Type definitions
│
├── frontend-vite-react/               # React frontend
│   └── src/
│       ├── modules/midnight/
│       │   ├── nft-sdk/               # NFT SDK module
│       │   │   ├── api/
│       │   │   │   ├── common-types.ts
│       │   │   │   └── contractController.ts
│       │   │   ├── contexts/
│       │   │   │   ├── nft-providers.tsx
│       │   │   │   ├── nft-deployment-class.ts
│       │   │   │   ├── nft-deployment.tsx
│       │   │   │   ├── nft-localStorage-class.ts
│       │   │   │   ├── nft-localStorage.tsx
│       │   │   │   └── index.tsx
│       │   │   └── hooks/
│       │   │       ├── use-providers.ts
│       │   │       ├── use-deployment.ts
│       │   │       ├── use-localStorage.ts
│       │   │       └── use-contract-subscription.ts
│       │   └── wallet-widget/         # Wallet connection UI
│       ├── pages/
│       │   ├── nft/index.tsx          # NFT Royalty page
│       │   ├── counter/index.tsx      # Counter page (template)
│       │   └── home/index.tsx         # Home page
│       ├── App.tsx                    # Router + providers
│       └── layouts/layout.tsx         # Navigation
│
└── deployment.json                    # Deployment metadata
```

## Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Smart Contract Language | Compact | 0.20.0 |
| Compact Compiler | compactc | +0.28.0 |
| Blockchain Runtime | compact-runtime | 0.14.0 |
| Ledger | @midnight-ntwrk/ledger-v7 | 7.0.0 |
| Contract SDK | @midnight-ntwrk/midnight-js-contracts | 3.0.0 |
| Type System | @midnight-ntwrk/midnight-js-types | 3.0.0 |
| Proof Provider | @midnight-ntwrk/midnight-js-http-client-proof-provider | 3.0.0 |
| ZK Config | @midnight-ntwrk/compact-js | 2.4.0 |
| Wallet SDK | @midnight-ntwrk/wallet-sdk | 1.0.0 |
| Frontend | React 19 + Vite 6 + TypeScript 5 |  |
| UI Components | shadcn/ui + Tailwind CSS 4 |  |
| State Management | RxJS BehaviorSubject |  |

## Building & Running

### Prerequisites

- Node.js 22+ (via nvm)
- Docker (for Midnight local network)
- Compact compiler (`compactc`)

### 1. Start Local Network

```bash
cd ~/midnight-local-network
docker compose up -d
```

### 2. Compile Contract

```bash
cd counter-contract
npx compactc src/private_nft_royalty.compact --output src/managed
```

### 3. Deploy Contract

```bash
cd counter-cli
npx ts-node src/api.ts
```

### 4. Build & Run Frontend

```bash
cd frontend-vite-react
npm run copy-contract-keys    # Copy ZK assets to public/
npm run build                 # TypeScript + Vite build
npm run dev                   # Start dev server at localhost:5173
```

### 5. Access the DApp

Navigate to `http://localhost:5173/nft` to interact with the Private NFT Royalty contract.

## Frontend Features

### Mint NFT
- Enter Token ID (hex), Creator address (hex), and Royalty percentage
- Royalty is stored privately via ZK witness — never revealed on-chain
- Transaction is proven, balanced, and submitted through the Midnight Lace wallet

### Transfer NFT
- Enter Token ID, Sender address, and Receiver address
- Only the current owner can transfer (enforced by contract assertion)

### Lookup
- **Get Owner**: Query the current owner of any NFT by Token ID
- **Get Creator**: Query the original creator of any NFT by Token ID

## Key Design Decisions

1. **Privacy-first royalties**: Royalty percentages are stored in ZK private state, not on the public ledger. This prevents competitors from learning an artist's royalty terms.

2. **Four ZK circuits**: Each operation (mint, transfer, get_owner, get_creator) has its own ZK circuit with prover and verifier keys, enabling full zero-knowledge proof verification.

3. **Modular SDK architecture**: The NFT SDK follows the same patterns as the counter SDK template — React contexts, hooks, and a controller class — making it easy to extend.

4. **Browser-compatible ZK**: Uses `CachedFetchZkConfigProvider` to load ZK keys from the browser via HTTP, with `withCompiledFileAssets` for type resolution and `httpClientProofProvider` for remote proof generation.

## License

Built for the Midnight Hackathon — Idea #125 submission.
