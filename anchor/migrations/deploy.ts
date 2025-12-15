// ============================================================
// ANCHOR MIGRATION SCRIPT
// ============================================================
// This script is called by `anchor migrate`

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey, SystemProgram } from "@solana/web3.js";

// Program type (will be 'any' until IDL is generated)
type AttestationProgram = any;

const SEEDS = {
  CONFIG: Buffer.from("config"),
} as const;

// Export the migration function that Anchor expects
module.exports = async function (provider: AnchorProvider) {
  // Configure the client to use the provider
  anchor.setProvider(provider);

  console.log("\n🚀 Running Anchor migration...");
  console.log("Wallet:", provider.wallet.publicKey.toBase58());
  console.log("Cluster:", provider.connection.rpcEndpoint);

  try {
    // Get the program
    const program = anchor.workspace.Attestation as Program<AttestationProgram>;
    console.log("Program ID:", program.programId.toBase58());

    // Derive config PDA
    const [configPda] = PublicKey.findProgramAddressSync(
      [SEEDS.CONFIG],
      program.programId
    );
    console.log("Config PDA:", configPda.toBase58());

    // Check if already initialized
    let isInitialized = false;
    try {
      await (program.account as any).programConfig.fetch(configPda);
      isInitialized = true;
      console.log("✅ Program already initialized");
    } catch {
      console.log("⏳ Program not initialized, initializing now...");
    }

    // Initialize if needed
    if (!isInitialized) {
      const tx = await (program.methods as any)
        .initialize()
        .accounts({
          admin: provider.wallet.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log("✅ Program initialized!");
      console.log("Transaction:", tx);

      // Wait for confirmation
      const latestBlockhash = await provider.connection.getLatestBlockhash();
      await provider.connection.confirmTransaction({
        signature: tx,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      });
    }

    // Verify the configuration
    const config = await (program.account as any).programConfig.fetch(
      configPda
    );
    console.log("\n📋 Program Configuration:");
    console.log("  Admin:", config.admin.toBase58());
    console.log("  Total Attestations:", config.totalAttestations.toString());
    console.log("  Is Paused:", config.isPaused);

    console.log("\n🎉 Migration completed successfully!");
    console.log("\n🔗 Explorer Links:");
    const explorerBase = "https://explorer.solana.com";
    const clusterParam = provider.connection.rpcEndpoint.includes("devnet")
      ? "?cluster=devnet"
      : "";
    console.log(
      `  Program: ${explorerBase}/address/${program.programId.toBase58()}${clusterParam}`
    );
    console.log(
      `  Config:  ${explorerBase}/address/${configPda.toBase58()}${clusterParam}`
    );
  } catch (error: any) {
    console.error("\n❌ Migration failed:");
    console.error(error.message);

    if (error.logs) {
      console.error("\n📜 Program Logs:");
      error.logs.forEach((log: string) => {
        console.error(`  ${log}`);
      });
    }

    throw error;
  }
};
