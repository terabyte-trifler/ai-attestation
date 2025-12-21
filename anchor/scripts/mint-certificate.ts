/**
 * Mint cNFT Certificate for an Attestation
 * 
 * This script mints a compressed NFT certificate that proves
 * an attestation was created on-chain.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from '@solana/spl-account-compression';
import {
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createMintV1Instruction,
  MetadataArgs,
  TokenProgramVersion,
  TokenStandard,
} from '@metaplex-foundation/mpl-bubblegum';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================
// CONFIGURATION
// ============================================================

const CLUSTER = process.env.CLUSTER || 'devnet';
const RPC_URLS: Record<string, string> = {
  devnet: 'https://api.devnet.solana.com',
  mainnet: 'https://api.mainnet-beta.solana.com',
  localnet: 'http://localhost:8899',
};

// Certificate metadata base URI (could be IPFS, Arweave, etc.)
const METADATA_BASE_URI = 'https://arweave.net/';

// ============================================================
// TYPES
// ============================================================

interface TreeInfo {
  merkleTree: string;
  treeConfig: string;
  maxDepth: number;
  maxBufferSize: number;
}

interface AttestationData {
  contentHash: string;
  aiProbability: number;
  contentType: string;
  detectionModel: string;
  creator: string;
  createdAt: number;
}

interface CertificateMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  external_url: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
  properties: {
    attestation: AttestationData;
    classification: string;
  };
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function loadKeypair(keypairPath?: string): Keypair {
  const defaultPath = path.join(
    process.env.HOME || '~',
    '.config/solana/id.json'
  );
  const filePath = keypairPath || process.env.WALLET_PATH || defaultPath;
  
  try {
    const keypairData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    console.error(`Error loading keypair from ${filePath}`);
    throw error;
  }
}

function loadTreeInfo(): TreeInfo {
  const treePath = path.join(__dirname, '..', 'tree-info.json');
  if (!fs.existsSync(treePath)) {
    throw new Error('Tree info not found. Run create-merkle-tree.ts first!');
  }
  return JSON.parse(fs.readFileSync(treePath, 'utf-8'));
}

function getClassification(aiProbability: number): string {
  if (aiProbability >= 7000) return 'AI Generated';
  if (aiProbability <= 3000) return 'Human Created';
  return 'Mixed/Uncertain';
}

function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'AI Generated': return '#EF4444'; // Red
    case 'Human Created': return '#22C55E'; // Green
    default: return '#EAB308'; // Yellow
  }
}

async function getTreeConfigPDA(merkleTree: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
}

// Generate metadata JSON for the certificate
function generateCertificateMetadata(
  attestation: AttestationData,
  certificateNumber: number
): CertificateMetadata {
  const classification = getClassification(attestation.aiProbability);
  const color = getClassificationColor(classification);
  
  return {
    name: `AI Attestation Certificate #${certificateNumber}`,
    symbol: 'AIAC',
    description: `This certificate verifies that content with hash ${attestation.contentHash.slice(0, 16)}... was analyzed for AI-generated content on the Solana blockchain.`,
    image: `https://api.dicebear.com/7.x/shapes/svg?seed=${attestation.contentHash}&backgroundColor=${color.slice(1)}`,
    external_url: `https://ai-attestation.app/attestation/${attestation.contentHash}`,
    attributes: [
      { trait_type: 'Classification', value: classification },
      { trait_type: 'AI Probability', value: `${(attestation.aiProbability / 100).toFixed(1)}%` },
      { trait_type: 'Content Type', value: attestation.contentType },
      { trait_type: 'Detection Model', value: attestation.detectionModel },
      { trait_type: 'Created At', value: new Date(attestation.createdAt * 1000).toISOString() },
    ],
    properties: {
      attestation,
      classification,
    },
  };
}

// ============================================================
// MINT FUNCTION
// ============================================================

async function mintCertificate(
  connection: Connection,
  payer: Keypair,
  treeInfo: TreeInfo,
  attestation: AttestationData,
  metadataUri: string
): Promise<string> {
  const merkleTree = new PublicKey(treeInfo.merkleTree);
  const [treeConfig, _] = await getTreeConfigPDA(merkleTree);
  
  const classification = getClassification(attestation.aiProbability);
  
  // Build metadata args for Bubblegum
  const metadataArgs: MetadataArgs = {
    name: `AI Attestation Certificate`,
    symbol: 'AIAC',
    uri: metadataUri,
    sellerFeeBasisPoints: 0,
    primarySaleHappened: true,
    isMutable: false,
    editionNonce: null,
    tokenStandard: TokenStandard.NonFungible,
    collection: null,
    uses: null,
    tokenProgramVersion: TokenProgramVersion.Original,
    creators: [
      {
        address: payer.publicKey,
        verified: true,
        share: 100,
      },
    ],
  };

  // Create mint instruction
  const mintIx = createMintV1Instruction(
    {
      treeAuthority: treeConfig,
      leafOwner: payer.publicKey,
      leafDelegate: payer.publicKey,
      merkleTree: merkleTree,
      payer: payer.publicKey,
      treeDelegate: payer.publicKey,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    },
    {
      message: metadataArgs,
    }
  );

  // Build and send transaction
  const tx = new Transaction().add(mintIx);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  const signature = await sendAndConfirmTransaction(
    connection,
    tx,
    [payer],
    { commitment: 'confirmed' }
  );

  return signature;
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║          cNFT CERTIFICATE MINTING FOR ATTESTATION          ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log();

  // Parse command line args
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.log('Usage: npx ts-node mint-certificate.ts <content-hash> [ai-probability] [content-type]');
    console.log();
    console.log('Example:');
    console.log('  npx ts-node mint-certificate.ts abc123... 8500 text');
    console.log();
    process.exit(1);
  }

  const contentHash = args[0];
  const aiProbability = parseInt(args[1] || '5000');
  const contentType = args[2] || 'text';

  // Connect
  const rpcUrl = RPC_URLS[CLUSTER];
  const connection = new Connection(rpcUrl, 'confirmed');
  console.log(`🌐 Cluster: ${CLUSTER}`);

  // Load wallet and tree info
  const payer = loadKeypair();
  console.log(`👛 Wallet: ${payer.publicKey.toBase58()}`);

  const treeInfo = loadTreeInfo();
  console.log(`🌳 Merkle Tree: ${treeInfo.merkleTree}`);
  console.log();

  // Build attestation data
  const attestation: AttestationData = {
    contentHash,
    aiProbability,
    contentType,
    detectionModel: 'desklib-raid-v1',
    creator: payer.publicKey.toBase58(),
    createdAt: Math.floor(Date.now() / 1000),
  };

  console.log('📄 Attestation Data:');
  console.log(`   Content Hash: ${contentHash.slice(0, 20)}...`);
  console.log(`   AI Probability: ${(aiProbability / 100).toFixed(1)}%`);
  console.log(`   Content Type: ${contentType}`);
  console.log(`   Classification: ${getClassification(aiProbability)}`);
  console.log();

  // Generate metadata (in production, upload to IPFS/Arweave)
  const metadata = generateCertificateMetadata(attestation, Date.now());
  console.log('📋 Certificate Metadata Generated');
  
  // For demo, use a placeholder URI (in production, upload metadata first)
  const metadataUri = `https://arweave.net/placeholder-${contentHash.slice(0, 8)}`;

  console.log('🚀 Minting cNFT Certificate...');
  console.log();

  try {
    const signature = await mintCertificate(
      connection,
      payer,
      treeInfo,
      attestation,
      metadataUri
    );

    console.log('╔════════════════════════════════════════════════════════════╗');
    console.log('║               ✅ CERTIFICATE MINTED!                       ║');
    console.log('╚════════════════════════════════════════════════════════════╝');
    console.log();
    console.log(`📝 Signature: ${signature}`);
    console.log(`🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`);
    console.log();
    console.log('📦 Metadata:');
    console.log(JSON.stringify(metadata, null, 2));

  } catch (error) {
    console.error('❌ Minting failed:', error);
    throw error;
  }
}

main().catch(console.error);