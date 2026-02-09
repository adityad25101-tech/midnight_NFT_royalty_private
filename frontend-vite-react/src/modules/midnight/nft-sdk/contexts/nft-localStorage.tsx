import { createContext, useMemo } from 'react';
import { type Logger } from 'pino';
import { NftLocalStorage, type NftLocalStorageProps } from './nft-localStorage-class';

export const NftLocalStorageContext = createContext<NftLocalStorageProps | undefined>(undefined);

export interface NftLocalStorageProviderProps {
  children: React.ReactNode;
  logger: Logger;
}

export const NftLocalStorageProvider = ({ children, logger }: NftLocalStorageProviderProps) => {
  const localStorageInstance = useMemo(() => new NftLocalStorage(logger), [logger]);

  return (
    <NftLocalStorageContext.Provider value={localStorageInstance}>
      {children}
    </NftLocalStorageContext.Provider>
  );
};
