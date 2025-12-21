/**
 * Create Merkle Tree for cNFT Certificate Minting
 *
 * This script creates a Bubblegum Merkle tree that will be used
 * to mint compressed NFT certificates for attestations.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAllocTreeIx,
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  ValidDepthSizePair,
  getConcurrentMerkleTreeAccountSize,
} from "@solana/spl-account-compression";
import {
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createCreateTreeInstruction,
} from "@metaplex-foundation/mpl-bubblegum";
import * as fs from "fs";
import * as path from "path";

// ============================================================
// CONFIGURATION
// ============================================================

const CLUSTER = process.env.CLUSTER || "devnet";
const RPC_URLS: Record<string, string> = {
  devnet: "https://api.devnet.solana.com",
  mainnet: "https://api.mainnet-beta.solana.com",
  localnet: "http://localhost:8899",
};

// Tree configuration
// maxDepth: 14, maxBufferSize: 64 = ~16,384 NFTs
// maxDepth: 20, maxBufferSize: 256 = ~1,048,576 NFTs
// maxDepth: 30, maxBufferSize: 512 = ~1 billion NFTs
const TREE_CONFIG = {
  maxDepth: 14,
  maxBufferSize: 64,
} as ValidDepthSizePair;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function loadKeypair(keypairPath?: string): Keypair {
  const defaultPath = path.join(
    process.env.HOME || "~",
    ".config/solana/id.json"
  );
  const filePath = keypairPath || process.env.WALLET_PATH || defaultPath;

  try {
    const keypairData = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    console.error(`Error loading keypair from ${filePath}`);
    throw error;
  }
}

function formatSol(lamports: number): string {
  return (lamports / 1e9).toFixed(4);
}

async function getTreeConfigPDA(
  merkleTree: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [merkleTree.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );
}

// ============================================================
// MAIN FUNCTION
// ============================================================

async function createMerkleTree() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║        MERKLE TREE CREATION FOR cNFT CERTIFICATES          ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log();

  // Connect to cluster
  const rpcUrl = RPC_URLS[CLUSTER] || RPC_URLS.devnet;
  const connection = new Connection(rpcUrl, "confirmed");
  console.log(`🌐 Cluster: ${CLUSTER}`);
  console.log(`📡 RPC: ${rpcUrl}`);
  console.log();

  // Load wallet
  const payer = loadKeypair();
  console.log(`👛 Wallet: ${payer.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(payer.publicKey);
  console.log(`💰 Balance: ${formatSol(balance)} SOL`);

  if (balance < 0.5 * 1e9) {
    console.error("❌ Insufficient balance. Need at least 0.5 SOL");
    process.exit(1);
  }
  console.log();

  // Calculate tree size and cost
  const { maxDepth, maxBufferSize } = TREE_CONFIG;
  const maxLeafNodes = 2 ** maxDepth;
  const treeSpace = getConcurrentMerkleTreeAccountSize(maxDepth, maxBufferSize);
  const treeCost = await connection.getMinimumBalanceForRentExemption(
    treeSpace
  );

  console.log("🌳 Tree Configuration:");
  console.log(`   Max Depth: ${maxDepth}`);
  console.log(`   Max Buffer Size: ${maxBufferSize}`);
  console.log(
    `   Max Leaf Nodes: ${maxLeafNodes.toLocaleString()} certificates`
  );
  console.log(`   Account Size: ${treeSpace.toLocaleString()} bytes`);
  console.log(`   Rent Cost: ${formatSol(treeCost)} SOL`);
  console.log();

  // Generate new merkle tree keypair
  const merkleTree = Keypair.generate();
  console.log(`🔑 Merkle Tree Address: ${merkleTree.publicKey.toBase58()}`);

  // Derive tree config PDA
  const [treeConfig, _] = await getTreeConfigPDA(merkleTree.publicKey);
  console.log(`📋 Tree Config PDA: ${treeConfig.toBase58()}`);
  console.log();

  // Build transaction
  console.log("📦 Building transaction...");

  // 1. Allocate tree account
  const allocTreeIx = await createAllocTreeIx(
    connection,
    merkleTree.publicKey,
    payer.publicKey,
    { maxDepth, maxBufferSize } as ValidDepthSizePair,
    maxDepth // canopy depth (same as max for full on-chain proofs)
  );

  // 2. Create Bubblegum tree config
  const createTreeIx = createCreateTreeInstruction(
    {
      treeAuthority: treeConfig,
      merkleTree: merkleTree.publicKey,
      payer: payer.publicKey,
      treeCreator: payer.publicKey,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
    },
    {
      maxBufferSize,
      maxDepth,
      public: false, // Only tree creator can mint
    }
  );

  // Create and send transaction
  const tx = new Transaction().add(allocTreeIx, createTreeIx);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

  console.log("🚀 Sending transaction...");

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [payer, merkleTree],
      { commitment: "confirmed" }
    );

    console.log();
    console.log(
      "╔════════════════════════════════════════════════════════════╗"
    );
    console.log(
      "║                    ✅ TREE CREATED!                        ║"
    );
    console.log(
      "╚════════════════════════════════════════════════════════════╝"
    );
    console.log();
    console.log(`🌳 Merkle Tree: ${merkleTree.publicKey.toBase58()}`);
    console.log(`📋 Tree Config: ${treeConfig.toBase58()}`);
    console.log(`📝 Signature: ${signature}`);
    console.log();
    console.log(
      `🔗 Explorer: https://explorer.solana.com/tx/${signature}?cluster=${CLUSTER}`
    );
    console.log();

    // Save tree info to file
    const treeInfo = {
      cluster: CLUSTER,
      merkleTree: merkleTree.publicKey.toBase58(),
      treeConfig: treeConfig.toBase58(),
      maxDepth,
      maxBufferSize,
      maxLeafNodes,
      signature,
      createdAt: new Date().toISOString(),
      // Save private key for testing (don't do this in production!)
      merkleTreeSecretKey: Array.from(merkleTree.secretKey),
    };

    const outputPath = path.join(__dirname, "..", "tree-info.json");
    fs.writeFileSync(outputPath, JSON.stringify(treeInfo, null, 2));
    console.log(`💾 Tree info saved to: ${outputPath}`);
    console.log();
    console.log(
      "⚠️  IMPORTANT: Update your program config with the merkle tree address!"
    );
  } catch (error) {
    console.error("❌ Transaction failed:", error);
    throw error;
  }
}

// Run
createMerkleTree().catch(console.error);
