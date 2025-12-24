import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";

// Load the IDL
const IDL = require("../target/idl/attestation.json");

const PROGRAM_ID = new PublicKey(
  "21fNgCDmvWAchVyP7eFzaZijaCC8As7RJtuM8SGhv9qr"
);

// Use devnet (testnet was having issues earlier)
const CLUSTER_URL = "https://api.devnet.solana.com";

async function main() {
  // Load wallet from default location
  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  // Create connection and provider
  const connection = new Connection(CLUSTER_URL, "confirmed");
  const wallet = new anchor.Wallet(walletKeypair);
  const provider = new anchor.AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  console.log("Cluster:", CLUSTER_URL);
  console.log("Wallet:", wallet.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  // Create program instance
  const program = new Program(IDL, PROGRAM_ID, provider);

  // Derive the config PDA
  const [configPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );

  console.log("Config PDA:", configPda.toBase58());

  // Check if already initialized
  try {
    const existingConfig = (await program.account.programConfig.fetch(
      configPda
    )) as {
      admin: PublicKey;
      totalAttestations: anchor.BN;
      isPaused: boolean;
    };
    console.log("\n✅ Program already initialized!");
    console.log("Admin:", existingConfig.admin.toBase58());
    console.log(
      "Total Attestations:",
      existingConfig.totalAttestations.toString()
    );
    console.log("Is Paused:", existingConfig.isPaused);
    return;
  } catch {
    console.log("\nProgram not initialized yet, initializing...");
  }

  // Initialize the program
  try {
    const tx = await program.methods
      .initialize()
      .accounts({
        admin: wallet.publicKey,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("\n✅ Program initialized!");
    console.log("Transaction signature:", tx);
    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

main().catch(console.error);
