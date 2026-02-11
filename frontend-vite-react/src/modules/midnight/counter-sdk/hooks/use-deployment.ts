import { useContext } from 'react';
import { DeployedProviderContext } from '../contexts/counter-deployment';
import type { DeployedAPIProvider } from '../contexts/counter-deployment-class';

export const useDeployedContracts = (): DeployedAPIProvider | null => {
  const context = useContext(DeployedProviderContext);
  if (!context) {
    return null;
  }
  return context;
};
