import { NftDeployedProvider } from './nft-deployment';
import { NftLocalStorageProvider } from './nft-localStorage';
import { NftProvider } from './nft-providers';
import { type Logger } from 'pino';
import { type ContractAddress } from '@midnight-ntwrk/compact-runtime';

export * from './nft-providers';
export * from './nft-localStorage';
export * from './nft-localStorage-class';
export * from './nft-deployment';
export * from './nft-deployment-class';

interface NftAppProviderProps {
  children: React.ReactNode;
  logger: Logger;
  contractAddress: ContractAddress;
}

export const NftAppProvider = ({ children, logger, contractAddress }: NftAppProviderProps) => {
  return (
    <NftLocalStorageProvider logger={logger}>
      <NftProvider logger={logger}>
        <NftDeployedProvider logger={logger} contractAddress={contractAddress}>
          {children}
        </NftDeployedProvider>
      </NftProvider>
    </NftLocalStorageProvider>
  );
};
