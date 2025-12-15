// ============================================================
// DEPLOY.TS - TypeScript Deployment Script
// ============================================================
//
// Equivalent to the JavaScript migration script but in TypeScript
// with better types, error handling, and additional features.
//
// Usage:
//   npx ts-node scripts/deploy.ts              # Deploy to devnet
//   npx ts-node scripts/deploy.ts --mainnet    # Deploy to mainnet  
//   npx ts-node scripts/deploy.ts --localnet   # Deploy to localnet
//   npx ts-node scripts/deploy.ts info         # Show info only
//   npx ts-node scripts/deploy.ts verify       # Verify deployment
//
// ============================================================

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Commitment,
} from "@solana/web3.js";
import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

// Import the generated types (after running anchor build)
// If types don't exist yet, we'll use 'any' as fallback
type AttestationProgram = any;

// ============================================================
// TYPES & INTERFACES
// ============================================================

interface DeployConfig {
  cluster: "devnet" | "mainnet-beta" | "localnet";
  rpcUrl: string;
  walletPath: string;
  commitment: Commitment;
}

interface ProgramConfig {
  admin: PublicKey;
  totalAttestations: BN;
  isPaused: boolean;
  bump: number;
}

interface AttestationData {
  contentHash: number[];
  aiProbability: number;
  contentType: string;
  detectionModel: string;
  metadataUri: string;
  creator: PublicKey;
  createdAt: BN;
  isVerified: boolean;
  verifiedBy: PublicKey | null;
  verifiedAt: BN | null;
  cnftAssetId: PublicKey | null;
  bump: number;
  version: number;
}

// ============================================================
// CONSTANTS
// ============================================================

const SEEDS = {
  CONFIG: Buffer.from("config"),
  ATTESTATION: Buffer.from("attestation"),
} as const;

const DEFAULT_WALLET_PATH = `${process.env.HOME}/.config/solana/id.json`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================

/**
 * Load a Keypair from a JSON file
 */
function loadKeypair(filePath: string): Keypair {
  const resolvedPath = path.resolve(filePath);
  
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Wallet file not found: ${resolvedPath}\nRun: solana-keygen new`);
  }
  
  try {
    const secretKey = JSON.parse(fs.readFileSync(resolvedPath, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(secretKey));
  } catch (error) {
    throw new Error(`Failed to parse wallet file: ${resolvedPath}`);
  }
}

/**
 * Get RPC URL for a cluster
 */
function getRpcUrl(cluster: string): string {
  // Check for environment variable first
  const envVar = `${cluster.toUpperCase().replace("-", "_")}_RPC`;
  if (process.env[envVar]) {
    return process.env[envVar]!;
  }
  
  switch (cluster) {
    case "devnet":
      return process.env.DEVNET_RPC || clusterApiUrl("devnet");
    case "mainnet-beta":
      return process.env.MAINNET_RPC || clusterApiUrl("mainnet-beta");
    case "localnet":
      return "http://127.0.0.1:8899";
    default:
      return clusterApiUrl("devnet");
  }
}

/**
 * Format lamports as SOL
 */
function formatSol(lamports: number): string {
  return (lamports / LAMPORTS_PER_SOL).toFixed(4);
}

/**
 * Shorten a public key for display
 */
function shortenPubkey(pubkey: PublicKey, chars: number = 4): string {
  const str = pubkey.toBase58();
  return `${str.slice(0, chars)}...${str.slice(-chars)}`;
}

/**
 * Generate a SHA-256 hash
 */
function sha256(data: string | Buffer): Buffer {
  return createHash("sha256").update(data).digest();
}

/**
 * Sleep for milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Print a separator line
 */
function separator(char: string = "=", length: number = 60): void {
  console.log(char.repeat(length));
}

// ============================================================
// DEPLOYER CLASS
// ============================================================

class AttestationDeployer {
  private connection: Connection;
  private wallet: Wallet;
  private provider: AnchorProvider;
  private program: Program<AttestationProgram>;
  private configPda: PublicKey;
  private configBump: number;
  private config: DeployConfig;

  constructor(config: DeployConfig) {
    this.config = config;
    
    // Load wallet keypair
    const walletKeypair = loadKeypair(config.walletPath);
    this.wallet = new Wallet(walletKeypair);
    
    // Create connection
    this.connection = new Connection(config.rpcUrl, config.commitment);
    
    // Create Anchor provider
    this.provider = new AnchorProvider(this.connection, this.wallet, {
      preflightCommitment: config.commitment,
      commitment: config.commitment,
    });
    anchor.setProvider(this.provider);
    
    // Load program from workspace
    // Note: This requires the IDL to be generated (anchor build)
    try {
      this.program = anchor.workspace.Attestation as Program<AttestationProgram>;
    } catch (error) {
      throw new Error(
        "Failed to load program. Make sure you've run 'anchor build' first."
      );
    }
    
    // Derive config PDA
    [this.configPda, this.configBump] = PublicKey.findProgramAddressSync(
      [SEEDS.CONFIG],
      this.program.programId
    );
  }

  // ----------------------------------------------------------
  // INFO & STATUS
  // ----------------------------------------------------------

  /**
   * Print deployment information
   */
  async printInfo(): Promise<void> {
    console.log("\n");
    separator();
    console.log("🚀 AI ATTESTATION PROGRAM - DEPLOYMENT INFO");
    separator();
    
    console.log("\n📋 Configuration:");
    console.log(`   Cluster:      ${this.config.cluster}`);
    console.log(`   RPC URL:      ${this.config.rpcUrl}`);
    console.log(`   Commitment:   ${this.config.commitment}`);
    
    console.log("\n🔑 Accounts:");
    console.log(`   Program ID:   ${this.program.programId.toBase58()}`);
    console.log(`   Admin Wallet: ${this.wallet.publicKey.toBase58()}`);
    console.log(`   Config PDA:   ${this.configPda.toBase58()}`);
    
    // Get wallet balance
    const balance = await this.connection.getBalance(this.wallet.publicKey);
    console.log(`\n💰 Wallet Balance: ${formatSol(balance)} SOL`);
    
    if (balance < 0.1 * LAMPORTS_PER_SOL) {
      console.log("   ⚠️  Low balance warning!");
      if (this.config.cluster === "devnet") {
        console.log("   Run: solana airdrop 2");
      }
    }
    
    // Check current slot
    const slot = await this.connection.getSlot();
    console.log(`\n📊 Current Slot: ${slot.toLocaleString()}`);
  }

  /**
   * Check if program config is initialized
   */
  async isInitialized(): Promise<boolean> {
    try {
      await this.program.account.programConfig.fetch(this.configPda);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Fetch and display current config
   */
  async fetchConfig(): Promise<ProgramConfig | null> {
    try {
      const config = await this.program.account.programConfig.fetch(this.configPda);
      return config as unknown as ProgramConfig;
    } catch {
      return null;
    }
  }

  // ----------------------------------------------------------
  // INITIALIZATION
  // ----------------------------------------------------------

  /**
   * Initialize the program configuration
   */
  async initialize(): Promise<string> {
    console.log("\n📦 Initializing program configuration...");
    
    const tx = await this.program.methods
      .initialize()
      .accounts({
        admin: this.wallet.publicKey,
        config: this.configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    // Wait for confirmation
    const latestBlockhash = await this.connection.getLatestBlockhash();
    await this.connection.confirmTransaction({
      signature: tx,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
    
    console.log(`   ✅ Transaction: ${tx}`);
    return tx;
  }

  // ----------------------------------------------------------
  // VERIFICATION
  // ----------------------------------------------------------

  /**
   * Verify the deployment
   */
  async verify(): Promise<boolean> {
    console.log("\n🔍 Verifying deployment...");
    
    const config = await this.fetchConfig();
    
    if (!config) {
      console.log("   ❌ Config account not found!");
      return false;
    }
    
    console.log("\n   ✅ Program Config:");
    console.log(`      Admin:              ${config.admin.toBase58()}`);
    console.log(`      Total Attestations: ${config.totalAttestations.toString()}`);
    console.log(`      Is Paused:          ${config.isPaused}`);
    console.log(`      Bump:               ${config.bump}`);
    
    // Verify admin matches deployer
    const adminMatches = config.admin.equals(this.wallet.publicKey);
    if (!adminMatches) {
      console.log("\n   ⚠️  Warning: Admin does not match current wallet!");
      console.log(`      Config Admin:  ${config.admin.toBase58()}`);
      console.log(`      Your Wallet:   ${this.wallet.publicKey.toBase58()}`);
    }
    
    return true;
  }

  // ----------------------------------------------------------
  // TEST ATTESTATION
  // ----------------------------------------------------------

  /**
   * Create a test attestation to verify everything works
   */
  async createTestAttestation(): Promise<void> {
    console.log("\n🧪 Creating test attestation...");
    
    // Generate unique content
    const testContent = `Test attestation created at ${new Date().toISOString()}`;
    const contentHash = sha256(testContent);
    
    // Derive attestation PDA
    const [attestationPda] = PublicKey.findProgramAddressSync(
      [SEEDS.ATTESTATION, contentHash],
      this.program.programId
    );
    
    console.log(`\n   📝 Test Content: "${testContent.slice(0, 50)}..."`);
    console.log(`   🔑 Content Hash: ${contentHash.toString("hex").slice(0, 16)}...`);
    console.log(`   📍 Attestation PDA: ${shortenPubkey(attestationPda, 8)}`);
    
    // Create attestation
    console.log("\n   Creating attestation...");
    
    const createTx = await this.program.methods
      .createAttestation(
        Array.from(contentHash),
        7500, // 75.00% AI probability
        "text",
        "desklib-v1.01",
        "ipfs://QmTestDeployment"
      )
      .accounts({
        creator: this.wallet.publicKey,
        attestation: attestationPda,
        config: this.configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    console.log(`   ✅ Created: ${createTx}`);
    
    // Fetch and display attestation
    await sleep(1000); // Wait for finalization
    
    const attestation = await this.program.account.attestation.fetch(attestationPda);
    
    console.log("\n   📄 Attestation Data:");
    console.log(`      AI Probability:  ${attestation.aiProbability / 100}%`);
    console.log(`      Content Type:    ${attestation.contentType}`);
    console.log(`      Detection Model: ${attestation.detectionModel}`);
    console.log(`      Metadata URI:    ${attestation.metadataUri}`);
    console.log(`      Creator:         ${shortenPubkey(attestation.creator)}`);
    console.log(`      Is Verified:     ${attestation.isVerified}`);
    
    // Close attestation to reclaim rent
    console.log("\n   🧹 Closing test attestation (reclaiming rent)...");
    
    const closeTx = await this.program.methods
      .closeAttestation()
      .accounts({
        creator: this.wallet.publicKey,
        attestation: attestationPda,
      })
      .rpc();
    
    console.log(`   ✅ Closed: ${closeTx}`);
    
    // Verify closure
    await sleep(500);
    const accountInfo = await this.connection.getAccountInfo(attestationPda);
    
    if (accountInfo === null) {
      console.log("   ✅ Attestation account successfully closed!");
    } else {
      console.log("   ⚠️  Account still exists (may take a moment to close)");
    }
  }

  // ----------------------------------------------------------
  // FULL DEPLOYMENT
  // ----------------------------------------------------------

  /**
   * Run the full deployment process
   */
  async deploy(): Promise<void> {
    try {
      // Print info
      await this.printInfo();
      
      // Check initialization status
      separator("-");
      console.log("\n🔎 Checking initialization status...");
      
      const isInit = await this.isInitialized();
      
      if (isInit) {
        console.log("   ✅ Program is already initialized!");
        await this.verify();
      } else {
        console.log("   ⏳ Program not initialized, initializing now...");
        await this.initialize();
        await this.verify();
      }
      
      // Run test attestation
      separator("-");
      await this.createTestAttestation();
      
      // Final summary
      console.log("\n");
      separator();
      console.log("🎉 DEPLOYMENT SUCCESSFUL!");
      separator();
      
      console.log("\n📝 Summary:");
      console.log(`   Program ID: ${this.program.programId.toBase58()}`);
      console.log(`   Config PDA: ${this.configPda.toBase58()}`);
      console.log(`   Cluster:    ${this.config.cluster}`);
      
      console.log("\n🔗 Explorer Links:");
      const explorerBase = `https://explorer.solana.com`;
      const clusterParam = this.config.cluster === "mainnet-beta" ? "" : `?cluster=${this.config.cluster}`;
      console.log(`   Program: ${explorerBase}/address/${this.program.programId.toBase58()}${clusterParam}`);
      console.log(`   Config:  ${explorerBase}/address/${this.configPda.toBase58()}${clusterParam}`);
      
      console.log("\n📋 Next Steps:");
      console.log("   1. Copy program ID to frontend .env");
      console.log("   2. Set up cNFT Merkle tree for certificates");
      console.log("   3. Configure IPFS/Arweave for metadata storage");
      console.log("   4. Deploy frontend to Vercel");
      
      console.log("\n");
      
    } catch (error: any) {
      console.error("\n");
      separator("!");
      console.error("❌ DEPLOYMENT FAILED");
      separator("!");
      
      console.error(`\nError: ${error.message}`);
      
      if (error.logs) {
        console.error("\n📜 Program Logs:");
        error.logs.forEach((log: string) => {
          console.error(`   ${log}`);
        });
      }
      
      throw error;
    }
  }
}

// ============================================================
// CLI ENTRY POINT
// ============================================================

async function main(): Promise<void> {
  // Parse CLI arguments
  const args = process.argv.slice(2);
  const command = args.find((arg) => !arg.startsWith("--")) || "deploy";
  
  // Determine cluster
  let cluster: "devnet" | "mainnet-beta" | "localnet" = "devnet";
  if (args.includes("--mainnet")) {
    cluster = "mainnet-beta";
  } else if (args.includes("--localnet")) {
    cluster = "localnet";
  }
  
  // Build config
  const config: DeployConfig = {
    cluster,
    rpcUrl: getRpcUrl(cluster),
    walletPath: process.env.WALLET_PATH || DEFAULT_WALLET_PATH,
    commitment: "confirmed",
  };
  
  // Create deployer
  const deployer = new AttestationDeployer(config);
  
  // Execute command
  switch (command) {
    case "deploy":
      await deployer.deploy();
      break;
      
    case "info":
      await deployer.printInfo();
      const isInit = await deployer.isInitialized();
      console.log(`\n   Initialized: ${isInit}`);
      if (isInit) {
        await deployer.verify();
      }
      break;
      
    case "verify":
      await deployer.printInfo();
      await deployer.verify();
      break;
      
    case "test":
      await deployer.printInfo();
      await deployer.createTestAttestation();
      break;
      
    case "help":
    default:
      console.log(`
AI Attestation Program - Deployment Script

Usage:
  npx ts-node scripts/deploy.ts [command] [options]

Commands:
  deploy    Deploy and initialize the program (default)
  info      Show deployment information
  verify    Verify program configuration
  test      Create and close a test attestation
  help      Show this help message

Options:
  --devnet    Deploy to devnet (default)
  --mainnet   Deploy to mainnet-beta
  --localnet  Deploy to local validator

Environment Variables:
  WALLET_PATH   Path to wallet keypair JSON
  DEVNET_RPC    Custom devnet RPC URL
  MAINNET_RPC   Custom mainnet RPC URL

Examples:
  npx ts-node scripts/deploy.ts                    # Deploy to devnet
  npx ts-node scripts/deploy.ts --mainnet          # Deploy to mainnet
  npx ts-node scripts/deploy.ts info               # Show info
  npx ts-node scripts/deploy.ts test --localnet    # Test on localnet
      `);
      break;
  }
}

// Run
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });