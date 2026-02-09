import { useContext } from 'react';
import { NftProvidersContext, type NftProvidersState } from '../contexts';

export const useNftProviders = (): NftProvidersState | null => {
  const providerState = useContext(NftProvidersContext);
  if (!providerState) {
    console.warn('[useNftProviders] not ready yet.');
    return null;
  }
  return providerState;
};
