import path from 'path';
import * as fs from 'fs';
import * as api from './api.js';
import { currentDir, UndeployedConfig } from './config.js';
import { createLogger } from './logger.js';

let logger: Awaited<ReturnType<typeof createLogger>>;

async function main() {
  console.log('Midnight Contract Deployment');
  console.log('Deploying: Private NFT Royalty (Idea #125)\n');
  console.log('Using local network with existing containers...\n');

  let wallet: api.WalletContext | null = null;

  try {
    const logDir = path.resolve(
      currentDir,
      '..',
      'logs',
      'deploy',
      `${new Date().toISOString()}.log`
    );
    logger = await createLogger(logDir);
    api.setLogger(logger);

    const walletSeed =
      '0000000000000000000000000000000000000000000000000000000000000001';
    console.log('Using genesis wallet seed for local network.\n');

    const config = new UndeployedConfig();

    console.log('Building wallet...');
    wallet = await api.buildWalletFromHexSeed(config, walletSeed);
    const walletAddress =
      wallet.unshieldedKeystore.getBech32Address().asString();
    console.log(`Wallet Address: ${walletAddress}`);

    const { total } = await api.displayWalletBalances(wallet.wallet);
    console.log(`Balance: ${total} tSTAR\n`);

    console.log('Configuring providers...');
    const providers = await api.configureProviders(wallet, config);

    console.log('Deploying Private NFT Royalty contract...');
    console.log('This may take 30-60 seconds...');
    const deployedContract = await api.deploy(providers, {
      royaltyPct: 10n,
    });

    const contractAddress =
      deployedContract.deployTxData.public.contractAddress;

    const deploymentInfo = {
      contractAddress,
      deployedAt: new Date().toISOString(),
      network: 'local',
      walletAddress,
      contract: 'private_nft_royalty',
      config: {
        indexer: config.indexer,
        indexerWS: config.indexerWS,
        node: config.node,
        proofServer: config.proofServer,
      },
    };

    const deploymentPath = path.resolve(
      currentDir,
      '..',
      'deployment.json'
    );
    fs.writeFileSync(
      deploymentPath,
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log('\n========================================');
    console.log('CONTRACT DEPLOYED SUCCESSFULLY');
    console.log('========================================');
    console.log(`Contract Address: ${contractAddress}`);
    console.log(`Deployment info saved at: ${deploymentPath}`);
    console.log('========================================\n');

    await api.closeWallet(wallet);
    process.exit(0);
  } catch (error) {
    console.error('Deployment failed:', error);
    if (wallet) await api.closeWallet(wallet);
    process.exit(1);
  }
}

main().catch(console.error);
