import { useContext } from 'react';
import { NftLocalStorageContext } from '../contexts/nft-localStorage';
import { type NftLocalStorageProps } from '../contexts/nft-localStorage-class';

export const useNftLocalState = (): NftLocalStorageProps => {
  const context = useContext(NftLocalStorageContext);

  if (!context) {
    throw new Error('Hook being used outside of the NftLocalStorageProvider');
  }
  return context;
};
