// ============================================================
// SOLANA PROGRAM CLIENT
// ============================================================
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { bytesToHex, hexToBytes } from "@/lib/utils";

// Instruction discriminators from the IDL
const CREATE_ATTESTATION_DISCRIMINATOR = Buffer.from([
  49, 24, 67, 80, 12, 249, 96, 239,
]);
const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "11111111111111111111111111111111"
);
const CONFIG_SEED = Buffer.from("config");
const ATTESTATION_SEED = Buffer.from("attestation");

// Type definitions for Solana program
export interface ProgramConfigAccount {
  admin: PublicKey;
  totalAttestations: number;
  isPaused: boolean;
  bump: number;
}

export interface AttestationAccount {
  contentHash: Uint8Array;
  aiProbability: number;
  contentType: string;
  detectionModel: string;
  metadataUri: string;
  creator: PublicKey;
  createdAt: { toNumber(): number };
  isVerified: boolean;
  verifiedBy?: PublicKey;
  verifiedAt?: { toNumber(): number };
  cnftAssetId?: PublicKey;
  bump: number;
  version: number;
}

export interface Attestation {
  publicKey: string;
  contentHash: string;
  aiProbability: number;
  contentType: string;
  detectionModel: string;
  metadataUri: string;
  creator: string;
  createdAt: Date;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: Date | null;
  cnftAssetId: string | null;
}

export interface ProgramAccount {
  publicKey: PublicKey;
  account: AttestationAccount;
}

// Type for program account namespace
interface ProgramAccountNamespace {
  programConfig: {
    fetch: (address: PublicKey) => Promise<ProgramConfigAccount>;
  };
  attestation: {
    fetch: (address: PublicKey) => Promise<AttestationAccount>;
    all: (filters?: unknown[]) => Promise<ProgramAccount[]>;
  };
}

// Type for program methods namespace
interface ProgramMethodsNamespace {
  createAttestation: (
    contentHash: number[],
    aiProbability: number,
    contentType: string,
    detectionModel: string,
    metadataUri: string
  ) => {
    accounts: (accounts: {
      creator: PublicKey;
      attestation: PublicKey;
      config: PublicKey;
      systemProgram: PublicKey;
    }) => { rpc: () => Promise<string> };
  };
  closeAttestation: () => {
    accounts: (accounts: { creator: PublicKey; attestation: PublicKey }) => {
      rpc: () => Promise<string>;
    };
  };
}
const IDL = {
  address: "21fNgCDmvWAchVyP7eFzaZijaCC8As7RJtuM8SGhv9qr",
  metadata: {
    name: "attestation",
    version: "0.1.0",
    spec: "0.1.0",
  },
  version: "0.1.0",
  name: "attestation",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "admin", isMut: true, isSigner: true },
        { name: "config", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [],
    },
    {
      name: "createAttestation",
      accounts: [
        { name: "creator", isMut: true, isSigner: true },
        { name: "attestation", isMut: true, isSigner: false },
        { name: "config", isMut: true, isSigner: false },
        { name: "systemProgram", isMut: false, isSigner: false },
      ],
      args: [
        { name: "contentHash", type: { array: ["u8", 32] } },
        { name: "aiProbability", type: "u16" },
        { name: "contentType", type: "string" },
        { name: "detectionModel", type: "string" },
        { name: "metadataUri", type: "string" },
      ],
    },
    {
      name: "closeAttestation",
      accounts: [
        { name: "creator", isMut: true, isSigner: true },
        { name: "attestation", isMut: true, isSigner: false },
      ],
      args: [],
    },
  ],
  accounts: [
    {
      name: "ProgramConfig",
      type: {
        kind: "struct",
        fields: [
          { name: "admin", type: "publicKey" },
          { name: "totalAttestations", type: "u64" },
          { name: "isPaused", type: "bool" },
          { name: "bump", type: "u8" },
        ],
      },
    },
    {
      name: "Attestation",
      type: {
        kind: "struct",
        fields: [
          { name: "contentHash", type: { array: ["u8", 32] } },
          { name: "aiProbability", type: "u16" },
          { name: "contentType", type: "string" },
          { name: "detectionModel", type: "string" },
          { name: "metadataUri", type: "string" },
          { name: "creator", type: "publicKey" },
          { name: "createdAt", type: "i64" },
          { name: "isVerified", type: "bool" },
          { name: "verifiedBy", type: { option: "publicKey" } },
          { name: "verifiedAt", type: { option: "i64" } },
          {
            name: "cnftAssetId",
            type: { option: "publicKey" },
          },
          { name: "bump", type: "u8" },
          { name: "version", type: "u8" },
        ],
      },
    },
  ],
};
export function getConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CONFIG_SEED], PROGRAM_ID);
}
export function getAttestationPda(contentHash: string): [PublicKey, number] {
  const hashBytes = hexToBytes(contentHash);
  return PublicKey.findProgramAddressSync(
    [ATTESTATION_SEED, Buffer.from(hashBytes)],
    PROGRAM_ID
  );
}
export class AttestationClient {
  private program: Program | null = null;
  private provider: AnchorProvider | null = null;
  private initError: string | null = null;

  constructor() {
    // Program will be initialized when provider is available
  }

  initializeProgram(provider: AnchorProvider): void {
    try {
      this.provider = provider;
      // For Anchor 0.29.x, pass IDL and programId separately
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.program = new Program(IDL as any, PROGRAM_ID, provider);
      this.initError = null;
    } catch (error) {
      console.error("Failed to initialize program:", error);
      this.initError = error instanceof Error ? error.message : "Unknown error";
      this.program = null;
      // Still store provider for raw transactions
      this.provider = provider;
    }
  }

  isInitialized(): boolean {
    return this.provider !== null;
  }

  getInitError(): string | null {
    return this.initError;
  }

  getProgramId(): PublicKey {
    return PROGRAM_ID;
  }
  async fetchConfig(): Promise<ProgramConfigAccount | null> {
    if (!this.program) throw new Error("Program not initialized");
    const [configPda] = getConfigPda();
    try {
      return await (
        this.program.account as unknown as ProgramAccountNamespace
      ).programConfig.fetch(configPda);
    } catch {
      return null;
    }
  }
  async fetchAttestation(contentHash: string): Promise<Attestation | null> {
    if (!this.program) throw new Error("Program not initialized");
    const [attestationPda] = getAttestationPda(contentHash);
    try {
      const account = await (
        this.program.account as unknown as ProgramAccountNamespace
      ).attestation.fetch(attestationPda);
      return this.parseAttestation(
        attestationPda,
        account as AttestationAccount
      );
    } catch {
      return null;
    }
  }
  async fetchAllAttestations(): Promise<Attestation[]> {
    if (!this.program) throw new Error("Program not initialized");
    const accounts = await (
      this.program.account as unknown as ProgramAccountNamespace
    ).attestation.all();
    return accounts.map(({ publicKey, account }: ProgramAccount) =>
      this.parseAttestation(publicKey, account)
    );
  }
  async fetchAttestationsByCreator(creator: PublicKey): Promise<Attestation[]> {
    if (!this.program) throw new Error("Program not initialized");
    const accounts = await (
      this.program.account as unknown as ProgramAccountNamespace
    ).attestation.all([
      {
        memcmp: {
          offset: 8 + 32 + 2 + 4 + 20 + 4 + 32 + 4 + 200,
          bytes: creator.toBase58(),
        },
      },
    ]);
    return accounts.map(({ publicKey, account }: ProgramAccount) =>
      this.parseAttestation(publicKey, account)
    );
  }
  async createAttestation(
    contentHash: string,
    aiProbability: number,
    contentType: string,
    detectionModel: string,
    metadataUri: string
  ): Promise<string> {
    if (!this.provider) throw new Error("Provider not initialized");
    if (!this.provider.publicKey) throw new Error("Wallet not connected");

    // Ensure content hash is 32 bytes
    let hashBytes: Uint8Array;
    if (contentHash.length === 64) {
      // Hex string
      hashBytes = hexToBytes(contentHash);
    } else {
      // Create a hash from the content
      const encoder = new TextEncoder();
      const data = encoder.encode(contentHash);
      const hashBuffer = await crypto.subtle.digest("SHA-256", data);
      hashBytes = new Uint8Array(hashBuffer);
    }

    // Derive PDAs
    const [attestationPda] = PublicKey.findProgramAddressSync(
      [ATTESTATION_SEED, Buffer.from(hashBytes)],
      PROGRAM_ID
    );
    const [configPda] = getConfigPda();

    // Convert probability to u16 (0-10000 for 0-100%)
    const probU16 = Math.round(aiProbability * 100);

    // Build instruction data
    const contentTypeBytes = Buffer.from(contentType);
    const detectionModelBytes = Buffer.from(detectionModel);
    const metadataUriBytes = Buffer.from(metadataUri);

    // Calculate buffer size
    const dataSize =
      8 + // discriminator
      32 + // content_hash
      2 + // ai_probability (u16)
      4 +
      contentTypeBytes.length + // string (4 byte len + data)
      4 +
      detectionModelBytes.length + // string
      4 +
      metadataUriBytes.length; // string

    const data = Buffer.alloc(dataSize);
    let offset = 0;

    // Write discriminator
    CREATE_ATTESTATION_DISCRIMINATOR.copy(data, offset);
    offset += 8;

    // Write content_hash
    Buffer.from(hashBytes).copy(data, offset);
    offset += 32;

    // Write ai_probability (u16 little-endian)
    data.writeUInt16LE(probU16, offset);
    offset += 2;

    // Write content_type string
    data.writeUInt32LE(contentTypeBytes.length, offset);
    offset += 4;
    contentTypeBytes.copy(data, offset);
    offset += contentTypeBytes.length;

    // Write detection_model string
    data.writeUInt32LE(detectionModelBytes.length, offset);
    offset += 4;
    detectionModelBytes.copy(data, offset);
    offset += detectionModelBytes.length;

    // Write metadata_uri string
    data.writeUInt32LE(metadataUriBytes.length, offset);
    offset += 4;
    metadataUriBytes.copy(data, offset);

    const instruction = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: this.provider.publicKey, isSigner: true, isWritable: true },
        { pubkey: attestationPda, isSigner: false, isWritable: true },
        { pubkey: configPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(instruction);
    tx.feePayer = this.provider.publicKey;
    tx.recentBlockhash = (
      await this.provider.connection.getLatestBlockhash()
    ).blockhash;

    // Sign and send
    const signedTx = await this.provider.wallet.signTransaction(tx);
    const signature = await this.provider.connection.sendRawTransaction(
      signedTx.serialize()
    );

    // Wait for confirmation
    await this.provider.connection.confirmTransaction(signature, "confirmed");

    console.log("Attestation created on-chain:", signature);
    return signature;
  }
  async closeAttestation(contentHash: string): Promise<string> {
    if (!this.program) throw new Error("Program not initialized");
    if (!this.program.provider.publicKey)
      throw new Error("Wallet not connected");

    const [attestationPda] = getAttestationPda(contentHash);
    return await (this.program.methods as unknown as ProgramMethodsNamespace)
      .closeAttestation()
      .accounts({
        creator: this.program.provider.publicKey,
        attestation: attestationPda,
      })
      .rpc();
  }
  private parseAttestation(
    publicKey: PublicKey,
    account: AttestationAccount
  ): Attestation {
    return {
      publicKey: publicKey.toBase58(),
      contentHash: bytesToHex(account.contentHash),
      aiProbability: account.aiProbability / 100,
      contentType: account.contentType,
      detectionModel: account.detectionModel,
      metadataUri: account.metadataUri,
      creator: account.creator.toBase58(),
      createdAt: new Date(account.createdAt.toNumber() * 1000),
      isVerified: account.isVerified,
      verifiedBy: account.verifiedBy?.toBase58() || null,
      verifiedAt: account.verifiedAt
        ? new Date(account.verifiedAt.toNumber() * 1000)
        : null,
      cnftAssetId: account.cnftAssetId?.toBase58() || null,
    };
  }
  async hasAttestation(contentHash: string): Promise<boolean> {
    return (await this.fetchAttestation(contentHash)) !== null;
  }
}
let clientInstance: AttestationClient | null = null;
export function getAttestationClient(): AttestationClient {
  if (!clientInstance) {
    clientInstance = new AttestationClient();
  }
  return clientInstance;
}
export default AttestationClient;
