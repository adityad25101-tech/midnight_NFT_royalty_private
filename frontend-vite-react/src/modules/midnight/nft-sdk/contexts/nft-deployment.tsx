import type { PropsWithChildren } from 'react';
import { createContext, useMemo } from 'react';
import { type Logger } from 'pino';
import type { NftDeployedAPIProvider } from './nft-deployment-class';
import { useNftLocalState } from '../hooks/use-localStorage';
import { NftDeployedManager } from './nft-deployment-class';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';
import { useNftProviders } from '../hooks/use-providers';

export const NftDeployedProviderContext = createContext<NftDeployedAPIProvider | undefined>(undefined);

export type NftDeployedProviderProps = PropsWithChildren<{
  logger: Logger;
  contractAddress: ContractAddress;
}>;

export const NftDeployedProvider = ({ logger, contractAddress, children }: NftDeployedProviderProps) => {
  const localState = useNftLocalState();
  const providers = useNftProviders();

  const manager = useMemo(() => {
    return new NftDeployedManager(logger, localState, contractAddress, providers?.providers);
  }, [logger, localState, providers?.providers]);

  return (
    <NftDeployedProviderContext.Provider value={manager}>
      {children}
    </NftDeployedProviderContext.Provider>
  );
};
