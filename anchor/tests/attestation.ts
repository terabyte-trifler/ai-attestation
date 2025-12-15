// ============================================================
// ATTESTATION PROGRAM TESTS
// ============================================================
// Run with: anchor test

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
// import { Attestation } from "../target/types/attestation";
type Attestation = any; // Use any type until IDL is generated
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { expect } from "chai";
import { createHash } from "crypto";

describe("attestation", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Attestation as Program<Attestation>;
  const admin = provider.wallet;
  const user = Keypair.generate();

  let configPda: PublicKey;
  let attestationPda: PublicKey;

  const testContent = "This is test content for AI detection.";
  const contentHash = createHash("sha256").update(testContent).digest();

  before(async () => {
    [configPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("config")],
      program.programId
    );

    [attestationPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("attestation"), contentHash],
      program.programId
    );

    // Airdrop to test user
    const sig = await provider.connection.requestAirdrop(
      user.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    console.log("Admin:", admin.publicKey.toBase58());
    console.log("Config PDA:", configPda.toBase58());
  });

  it("Initializes the program", async () => {
    try {
      await (program.methods as any)
        .initialize()
        .accounts({
          admin: admin.publicKey,
          config: configPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      const config = await (program.account as any).programConfig.fetch(
        configPda
      );
      expect(config.admin.toBase58()).to.equal(admin.publicKey.toBase58());
      console.log("✅ Program initialized");
    } catch (e: any) {
      if (e.message.includes("already in use")) {
        console.log("Config already exists (skipping)");
      } else {
        throw e;
      }
    }
  });

  it("Creates an attestation", async () => {
    await (program.methods as any)
      .createAttestation(
        Array.from(contentHash) as any,
        8500, // 85% AI
        "text",
        "desklib-v1.01",
        "ipfs://QmTest123"
      )
      .accounts({
        creator: admin.publicKey,
        attestation: attestationPda,
        config: configPda,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    const attestation = await (program.account as any).attestation.fetch(
      attestationPda
    );
    expect(attestation.aiProbability).to.equal(8500);
    expect(attestation.contentType).to.equal("text");
    console.log("✅ Attestation created (85% AI)");
  });

  it("Links a certificate", async () => {
    const assetId = Keypair.generate().publicKey;

    await (program.methods as any)
      .linkCertificate(assetId)
      .accounts({
        creator: admin.publicKey,
        attestation: attestationPda,
      })
      .rpc();

    const attestation = await (program.account as any).attestation.fetch(
      attestationPda
    );
    expect(attestation.cnftAssetId.toBase58()).to.equal(assetId.toBase58());
    console.log("✅ Certificate linked");
  });

  it("Verifies attestation (admin)", async () => {
    await (program.methods as any)
      .verifyAttestation()
      .accounts({
        authority: admin.publicKey,
        attestation: attestationPda,
        config: configPda,
      })
      .rpc();

    const attestation = await (program.account as any).attestation.fetch(
      attestationPda
    );
    expect(attestation.isVerified).to.be.true;
    console.log("✅ Attestation verified");
  });

  it("Updates metadata", async () => {
    await (program.methods as any)
      .updateMetadata("ipfs://QmUpdated")
      .accounts({
        creator: admin.publicKey,
        attestation: attestationPda,
      })
      .rpc();

    const attestation = await (program.account as any).attestation.fetch(
      attestationPda
    );
    expect(attestation.metadataUri).to.equal("ipfs://QmUpdated");
    console.log("✅ Metadata updated");
  });

  it("Rejects unauthorized update", async () => {
    try {
      await (program.methods as any)
        .updateMetadata("ipfs://Hacked")
        .accounts({
          creator: user.publicKey,
          attestation: attestationPda,
        })
        .signers([user])
        .rpc();
      expect.fail("Should have thrown");
    } catch (e: any) {
      expect(e.message).to.include("Unauthorized");
      console.log("✅ Unauthorized update rejected");
    }
  });

  it("Closes attestation", async () => {
    await (program.methods as any)
      .closeAttestation()
      .accounts({
        creator: admin.publicKey,
        attestation: attestationPda,
      })
      .rpc();

    const account = await provider.connection.getAccountInfo(attestationPda);
    expect(account).to.be.null;
    console.log("✅ Attestation closed, rent reclaimed");
  });
});
