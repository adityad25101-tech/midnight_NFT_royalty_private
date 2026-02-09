import type { Logger } from 'pino';

export interface NftLocalStorageProps {
  readonly addContract: (contract: string) => void;
  readonly getContracts: () => string[];
}

export class NftLocalStorage implements NftLocalStorageProps {
  constructor(private readonly logger: Logger) {}

  addContract(contract: string): void {
    this.logger.trace(`Adding NFT contract ${contract}`);
    const item = window.localStorage.getItem('nft_contracts');
    const contracts: string[] = item ? JSON.parse(item) : [];
    const updatedContracts = Array.from(new Set([...contracts, contract]));
    window.localStorage.setItem('nft_contracts', JSON.stringify(updatedContracts));
  }

  getContracts(): string[] {
    const item = window.localStorage.getItem('nft_contracts');
    const contracts: string[] = item ? JSON.parse(item) : [];
    return Array.from<string>(new Set([...contracts]));
  }
}
