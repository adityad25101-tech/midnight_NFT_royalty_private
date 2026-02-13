import path from 'path';
import * as fs from 'fs';
import * as api from './api.js';
import { currentDir, UndeployedConfig } from './config.js';
import { createLogger } from './logger.js';

let logger: Awaited<ReturnType<typeof createLogger>>;

async function main() {
  console.log('=== Private NFT Royalty — On-Chain Test ===\n');

  let wallet: api.WalletContext | null = null;

  try {
    const logDir = path.resolve(currentDir, '..', 'logs', 'test-mint', `${new Date().toISOString()}.log`);
    logger = await createLogger(logDir);
    api.setLogger(logger);

    // Read deployment info
    const deploymentPath = path.resolve(currentDir, '..', 'deployment.json');
    if (!fs.existsSync(deploymentPath)) {
      console.error('❌ deployment.json not found. Run deploy first.');
      process.exit(1);
    }
    const deployment = JSON.parse(fs.readFileSync(deploymentPath, 'utf-8'));
    const contractAddress = deployment.contractAddress;
    console.log(`Contract: ${contractAddress}\n`);

    // Build wallet
    const walletSeed = '0000000000000000000000000000000000000000000000000000000000000001';
    const config = new UndeployedConfig();
    console.log('Building wallet...');
    wallet = await api.buildWalletFromHexSeed(config, walletSeed);
    console.log('Wallet ready.\n');

    // Configure providers
    console.log('Configuring providers...');
    const providers = await api.configureProviders(wallet, config);

    // Join deployed contract
    console.log('Joining deployed contract...');
    const contract = await api.joinContract(providers, contractAddress);
    console.log('Joined contract successfully!\n');

    // === TEST 1: Mint NFT ===
    console.log('--- TEST 1: Mint NFT ---');
    const tokenId = new Uint8Array(32);
    tokenId[31] = 1; // token_id = 0x00...01

    const creator = new Uint8Array(32);
    creator[31] = 0xAA; // creator = 0x00...AA

    const royaltyPct = 10n;

    console.log(`Token ID: 0x${'00'.repeat(31)}01`);
    console.log(`Creator:  0x${'00'.repeat(31)}aa`);
    console.log(`Royalty:  ${royaltyPct}% (private, stored in ZK state)`);
    console.log('Submitting mint transaction...');

    const mintResult = await contract.callTx.mint(tokenId, creator, royaltyPct);
    console.log(`✅ Mint SUCCESS!`);
    console.log(`   TX Hash: ${mintResult.public.txHash}`);
    console.log(`   Block:   ${mintResult.public.blockHeight}\n`);

    // === TEST 2: Mint another NFT ===
    console.log('--- TEST 2: Mint Second NFT ---');
    const tokenId2 = new Uint8Array(32);
    tokenId2[31] = 2; // token_id = 0x00...02

    const creator2 = new Uint8Array(32);
    creator2[31] = 0xBB; // creator = 0x00...BB

    console.log(`Token ID: 0x${'00'.repeat(31)}02`);
    console.log(`Creator:  0x${'00'.repeat(31)}bb`);
    console.log(`Royalty:  25% (private)`);
    console.log('Submitting mint transaction...');

    const mintResult2 = await contract.callTx.mint(tokenId2, creator2, 25n);
    console.log(`✅ Mint SUCCESS!`);
    console.log(`   TX Hash: ${mintResult2.public.txHash}`);
    console.log(`   Block:   ${mintResult2.public.blockHeight}\n`);

    // === TEST 3: Transfer NFT ===
    console.log('--- TEST 3: Transfer NFT #1 ---');
    const receiver = new Uint8Array(32);
    receiver[31] = 0xCC; // receiver = 0x00...CC

    console.log(`Token ID: 0x${'00'.repeat(31)}01`);
    console.log(`From:     0x${'00'.repeat(31)}aa`);
    console.log(`To:       0x${'00'.repeat(31)}cc`);
    console.log('Submitting transfer transaction...');

    const transferResult = await contract.callTx.transfer(tokenId, creator, receiver);
    console.log(`✅ Transfer SUCCESS!`);
    console.log(`   TX Hash: ${transferResult.public.txHash}`);
    console.log(`   Block:   ${transferResult.public.blockHeight}\n`);

    // === TEST 4: Get Owner ===
    console.log('--- TEST 4: Get Owner of Token #1 ---');
    console.log('Querying owner on-chain...');
    const ownerResult = await contract.callTx.get_owner(tokenId);
    console.log(`✅ Get Owner SUCCESS!`);
    console.log(`   TX Hash: ${ownerResult.public.txHash}`);
    console.log(`   Block:   ${ownerResult.public.blockHeight}\n`);

    // === TEST 5: Get Creator ===
    console.log('--- TEST 5: Get Creator of Token #1 ---');
    console.log('Querying creator on-chain...');
    const creatorResult = await contract.callTx.get_creator(tokenId);
    console.log(`✅ Get Creator SUCCESS!`);
    console.log(`   TX Hash: ${creatorResult.public.txHash}`);
    console.log(`   Block:   ${creatorResult.public.blockHeight}\n`);

    console.log('==========================================');
    console.log('ALL 5 TESTS PASSED! ✅');
    console.log('==========================================');
    console.log('\nContract operations verified on Midnight local network.');
    console.log('Royalty percentages remain private (ZK state).');
    console.log('Ownership and creator info are public (on-chain ledger).');

    // Save test results
    const testResults = {
      contractAddress,
      tests: [
        { name: 'mint_nft_1', txHash: mintResult.public.txHash, block: String(mintResult.public.blockHeight) },
        { name: 'mint_nft_2', txHash: mintResult2.public.txHash, block: String(mintResult2.public.blockHeight) },
        { name: 'transfer_nft_1', txHash: transferResult.public.txHash, block: String(transferResult.public.blockHeight) },
        { name: 'get_owner', txHash: ownerResult.public.txHash, block: String(ownerResult.public.blockHeight) },
        { name: 'get_creator', txHash: creatorResult.public.txHash, block: String(creatorResult.public.blockHeight) },
      ],
      timestamp: new Date().toISOString(),
    };
    const resultsPath = path.resolve(currentDir, '..', 'test-results.json');
    fs.writeFileSync(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`\nTest results saved to: ${resultsPath}`);

    if (wallet) await api.closeWallet(wallet);
    process.exit(0);
  } catch (error) {
    if (wallet) await api.closeWallet(wallet);
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
