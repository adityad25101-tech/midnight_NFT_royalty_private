import { useContext } from 'react';
import { NftDeployedProviderContext, type NftDeployedAPIProvider } from '../contexts';

export const useNftDeployedContracts = (): NftDeployedAPIProvider | null => {
  const context = useContext(NftDeployedProviderContext);
  if (!context) {
    return null;
  }
  return context;
};
