import * as ledger from "@midnight-ntwrk/ledger-v7";
import {
  type MidnightProvider,
  type WalletProvider,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type UnboundTransaction,
  ZKConfigProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { createContext, useCallback, useMemo, useState } from "react";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { type Logger } from "pino";
import type { NftCircuits } from "../api/common-types";
import { type NftProviders, NftPrivateStateId } from "../api/common-types";
import { useWallet } from "../../wallet-widget/hooks/useWallet";
import {
  type ActionMessages,
  type ProviderAction,
  WrappedPublicDataProvider,
} from "../../wallet-widget/utils/providersWrappers/publicDataProvider";
import { CachedFetchZkConfigProvider } from "../../wallet-widget/utils/providersWrappers/zkConfigProvider";
import { inMemoryPrivateStateProvider } from "../../wallet-widget/utils/customImplementations/in-memory-private-state-provider";
import { type NftPrivateState } from "@meshsdk/counter-contract";
import { toHex, fromHex } from "@midnight-ntwrk/compact-runtime";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";

export interface NftProvidersState {
  privateStateProvider: PrivateStateProvider<typeof NftPrivateStateId>;
  zkConfigProvider?: ZKConfigProvider<NftCircuits>;
  proofProvider: ProofProvider;
  publicDataProvider?: PublicDataProvider;
  walletProvider?: WalletProvider;
  midnightProvider?: MidnightProvider;
  providers?: NftProviders;
  flowMessage?: string;
}

interface NftProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export const NftProvidersContext = createContext<NftProvidersState | undefined>(undefined);

export const NftProvider = ({ children, logger }: NftProviderProps) => {
  const [flowMessage, setFlowMessage] = useState<string | undefined>(undefined);
  const { serviceUriConfig, connectedAPI, status, shieldedAddresses } = useWallet();

  const actionMessages = useMemo<ActionMessages>(
    () => ({
      proveTxStarted: "Proving transaction...",
      proveTxDone: undefined,
      balanceTxStarted: "Signing the transaction with Midnight Lace wallet...",
      balanceTxDone: undefined,
      downloadProverStarted: "Downloading prover key...",
      downloadProverDone: undefined,
      submitTxStarted: "Submitting transaction...",
      submitTxDone: undefined,
      watchForTxDataStarted: "Waiting for transaction finalization on blockchain...",
      watchForTxDataDone: undefined,
    }),
    []
  );

  const providerCallback = useCallback(
    (action: ProviderAction): void => {
      setFlowMessage(actionMessages[action]);
    },
    [actionMessages]
  );

  const privateStateProvider: PrivateStateProvider<typeof NftPrivateStateId> = useMemo(
    () => inMemoryPrivateStateProvider<typeof NftPrivateStateId, NftPrivateState>(),
    [status]
  );

  const publicDataProvider: PublicDataProvider | undefined = useMemo(
    () =>
      serviceUriConfig
        ? new WrappedPublicDataProvider(
            indexerPublicDataProvider(serviceUriConfig.indexerUri, serviceUriConfig.indexerWsUri),
            providerCallback,
            logger
          )
        : undefined,
    [serviceUriConfig, providerCallback, logger, status]
  );

  const zkConfigProvider = useMemo(() => {
    if (typeof window === "undefined") return undefined;
    return new CachedFetchZkConfigProvider<NftCircuits>(
      window.location.origin + "/midnight/private_nft_royalty",
      fetch.bind(window),
      () => {}
    );
  }, [status]);

  const proofProvider: ProofProvider = useMemo(
    () => {
      if (serviceUriConfig?.proverServerUri && zkConfigProvider) {
        return httpClientProofProvider(serviceUriConfig.proverServerUri, zkConfigProvider);
      }
      return {
        proveTx: (): Promise<UnboundTransaction> =>
          Promise.reject(new Error("Proof server not available")),
      };
    },
    [serviceUriConfig, zkConfigProvider, status]
  );

  const walletProvider: WalletProvider = useMemo(
    () =>
      connectedAPI
        ? {
            getCoinPublicKey(): ledger.CoinPublicKey {
              return (shieldedAddresses?.shieldedCoinPublicKey ?? '') as ledger.CoinPublicKey;
            },
            getEncryptionPublicKey(): ledger.EncPublicKey {
              return (shieldedAddresses?.shieldedEncryptionPublicKey ?? '') as ledger.EncPublicKey;
            },
            async balanceTx(
              tx: UnboundTransaction,
              _ttl?: Date
            ): Promise<ledger.FinalizedTransaction> {
              try {
                logger.info("Balancing transaction via wallet");
                const serializedTx = toHex(tx.serialize());
                const received = await connectedAPI.balanceUnsealedTransaction(serializedTx);
                const transaction = ledger.Transaction.deserialize<
                  ledger.SignatureEnabled,
                  ledger.Proof,
                  ledger.Binding
                >(
                  "signature",
                  "proof",
                  "binding",
                  fromHex(received.tx)
                );
                return transaction;
              } catch (e: any) {
                // Unwrap FiberFailure / Effect error chain
                let rootCause = e;
                let depth = 0;
                while (rootCause?.cause && depth < 10) {
                  rootCause = rootCause.cause;
                  depth++;
                }
                const errMsg = rootCause?.message || rootCause?.error?.message || rootCause?.toString?.() || String(e);
                console.error("=== BALANCE TX ERROR (root cause) ===");
                console.error("Message:", errMsg);
                console.error("Root cause object:", rootCause);
                console.error("Original error:", e);
                console.error("Cause chain depth:", depth);
                if (rootCause?.error) console.error("Inner error:", rootCause.error);
                if (rootCause?.stack) console.error("Stack:", rootCause.stack);
                logger.error({ error: e }, "Error balancing transaction via wallet");
                throw e;
              }
            },
          }
        : {
            getCoinPublicKey(): ledger.CoinPublicKey {
              return (shieldedAddresses?.shieldedCoinPublicKey ?? '') as ledger.CoinPublicKey;
            },
            getEncryptionPublicKey(): ledger.EncPublicKey {
              return (shieldedAddresses?.shieldedEncryptionPublicKey ?? '') as ledger.EncPublicKey;
            },
            balanceTx: (): Promise<ledger.FinalizedTransaction> => Promise.reject(new Error("readonly")),
          },
    [connectedAPI, logger, status]
  );

  const midnightProvider: MidnightProvider = useMemo(
    () =>
      connectedAPI
        ? {
            submitTx: async (tx: ledger.FinalizedTransaction): Promise<ledger.TransactionId> => {
              const serializedTx = toHex(tx.serialize());
              await connectedAPI.submitTransaction(serializedTx);
              const txIdentifiers = tx.identifiers();
              const txId = txIdentifiers[0];
              logger.info({ txId }, "Submitted transaction via wallet");
              return txId;
            },
          }
        : {
            submitTx: (): Promise<ledger.TransactionId> => Promise.reject(new Error("readonly")),
          },
    [connectedAPI, logger, status]
  );

  const combinedProviders: NftProvidersState = useMemo(() => {
    return {
      privateStateProvider,
      publicDataProvider,
      proofProvider,
      zkConfigProvider,
      walletProvider,
      midnightProvider,
      providers:
        publicDataProvider && zkConfigProvider
          ? {
              privateStateProvider,
              publicDataProvider,
              zkConfigProvider,
              proofProvider,
              walletProvider,
              midnightProvider,
            }
          : undefined,
      flowMessage,
    };
  }, [privateStateProvider, publicDataProvider, proofProvider, zkConfigProvider, walletProvider, midnightProvider, flowMessage]);

  return (
    <NftProvidersContext.Provider value={combinedProviders}>
      {children}
    </NftProvidersContext.Provider>
  );
};
