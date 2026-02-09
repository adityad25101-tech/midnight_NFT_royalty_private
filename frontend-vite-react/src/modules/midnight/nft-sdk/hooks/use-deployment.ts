import { useContext } from 'react';
import { NftDeployedProviderContext, type NftDeployedAPIProvider } from '../contexts';

export const useNftDeployedContracts = (): NftDeployedAPIProvider => {
  const context = useContext(NftDeployedProviderContext);

  if (!context) {
    throw new Error('A wallet and NftProvider context is required.');
  }

  return context;
};
