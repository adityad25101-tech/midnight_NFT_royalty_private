import * as ledger from "@midnight-ntwrk/ledger-v7";
import {
  type MidnightProvider,
  type WalletProvider,
  type PrivateStateProvider,
  type ProofProvider,
  type PublicDataProvider,
  type UnboundTransaction,
  type ZKConfigProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { createContext, useCallback, useMemo, useState } from "react";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { type Logger } from "pino";
import { CounterPrivateStateId, type CounterCircuits, type CounterProviders } from "../api/common-types";
import { useWallet } from "../../wallet-widget/hooks/useWallet";
import {
  type ActionMessages,
  type ProviderAction,
  WrappedPublicDataProvider,
} from "../../wallet-widget/utils/providersWrappers/publicDataProvider";
import { CachedFetchZkConfigProvider } from "../../wallet-widget/utils/providersWrappers/zkConfigProvider";
import { inMemoryPrivateStateProvider } from "../../wallet-widget/utils/customImplementations/in-memory-private-state-provider";
import { toHex, fromHex } from "@midnight-ntwrk/compact-runtime";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import type { CounterPrivateState } from "@meshsdk/counter-contract";

export interface CounterProvidersState {
  privateStateProvider: PrivateStateProvider<typeof CounterPrivateStateId>;
  zkConfigProvider?: ZKConfigProvider<CounterCircuits>;
  proofProvider: ProofProvider;
  publicDataProvider?: PublicDataProvider;
  walletProvider?: WalletProvider;
  midnightProvider?: MidnightProvider;
  providers?: CounterProviders;
  flowMessage?: string;
}

interface CounterProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export const CounterProvidersContext = createContext<CounterProvidersState | undefined>(undefined);

export const CounterProvider = ({ children, logger }: CounterProviderProps) => {
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

  const privateStateProvider = useMemo(
    () => inMemoryPrivateStateProvider<typeof CounterPrivateStateId, CounterPrivateState>(),
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
    return new CachedFetchZkConfigProvider<CounterCircuits>(
      window.location.origin + "/midnight/counter",
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
                const errMsg = e?.message || e?.toString?.() || String(e);
                console.error("Error balancing transaction via wallet:", errMsg, e);
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

  const combinedProviders: CounterProvidersState = useMemo(() => {
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
            } as CounterProviders
          : undefined,
      flowMessage,
    };
  }, [privateStateProvider, publicDataProvider, proofProvider, zkConfigProvider, walletProvider, midnightProvider, flowMessage]);

  return (
    <CounterProvidersContext.Provider value={combinedProviders}>
      {children}
    </CounterProvidersContext.Provider>
  );
};

export { CounterProvider as Provider };
export { CounterProvidersContext as ProvidersContext };
export type { CounterProvidersState as ProvidersState };
