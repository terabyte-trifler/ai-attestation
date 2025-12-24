import {
  Connection,
  PublicKey,
  SystemProgram,
  Keypair,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import * as fs from "fs";
import * as os from "os";

const PROGRAM_ID = new PublicKey(
  "21fNgCDmvWAchVyP7eFzaZijaCC8As7RJtuM8SGhv9qr"
);
const CLUSTER_URL = "https://api.testnet.solana.com";

// Initialize instruction discriminator from IDL
const INITIALIZE_DISCRIMINATOR = Buffer.from([
  175, 175, 109, 31, 13, 152, 155, 237,
]);

async function main() {
  // Load wallet
  const walletPath = `${os.homedir()}/.config/solana/id.json`;
  const walletKeypair = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, "utf-8")))
  );

  const connection = new Connection(CLUSTER_URL, "confirmed");

  console.log("Cluster:", CLUSTER_URL);
  console.log("Wallet:", walletKeypair.publicKey.toBase58());
  console.log("Program ID:", PROGRAM_ID.toBase58());

  // Derive config PDA
  const [configPda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    PROGRAM_ID
  );
  console.log("Config PDA:", configPda.toBase58());

  // Check if already initialized
  const configAccount = await connection.getAccountInfo(configPda);
  if (configAccount) {
    console.log("\n✅ Program already initialized!");
    console.log("Config account size:", configAccount.data.length, "bytes");
    return;
  }

  console.log("\nInitializing program...");

  // Build initialize instruction
  const initializeIx = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: walletKeypair.publicKey, isSigner: true, isWritable: true },
      { pubkey: configPda, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: INITIALIZE_DISCRIMINATOR,
  });

  const tx = new Transaction().add(initializeIx);

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      tx,
      [walletKeypair],
      {
        commitment: "confirmed",
      }
    );

    console.log("\n✅ Program initialized!");
    console.log("Transaction signature:", signature);
    console.log("\nView on Solana Explorer:");
    console.log(`https://explorer.solana.com/tx/${signature}?cluster=devnet`);
  } catch (error) {
    console.error("Failed to initialize:", error);
  }
}

main().catch(console.error);
