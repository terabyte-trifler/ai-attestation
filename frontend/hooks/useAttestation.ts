"use client";
// ============================================================
// CUSTOM HOOKS
// ============================================================
import { useState, useEffect, useCallback } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider } from "@coral-xyz/anchor";
// Remove unused import
import { getAttestationClient, Attestation } from "@/lib/solana/program";
import { TextDetectionResult, ImageDetectionResult } from "@/types";
import { api, ImageDetectionMode, ServiceStatus } from "@/lib/api/client";
export function useProgram() {
  const { connection } = useConnection();
  const wallet = useWallet();

  // Initialize client once
  const [client] = useState(() => getAttestationClient());
  const [initError, setInitError] = useState<string | null>(null);

  // Compute ready state
  const isReady = Boolean(
    wallet.publicKey && wallet.signTransaction && client.isInitialized()
  );

  // Initialize program when wallet is ready
  useEffect(() => {
    if (wallet.publicKey && wallet.signTransaction) {
      try {
        const provider = new AnchorProvider(connection, wallet as never, {
          commitment: "confirmed",
        });
        client.initializeProgram(provider);
        setInitError(client.getInitError());
      } catch (error) {
        console.error("Failed to create provider:", error);
        setInitError(
          error instanceof Error ? error.message : "Failed to initialize"
        );
      }
    }
  }, [client, connection, wallet]);

  return { client, isReady, connection, wallet, initError };
}
export function useAttestations() {
  const { client, isReady } = useProgram();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAttestations = useCallback(async () => {
    if (!client || !isReady) return;
    setIsLoading(true);
    setError(null);
    try {
      setAttestations(await client.fetchAllAttestations());
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch attestations"
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, isReady]);
  useEffect(() => {
    fetchAttestations();
  }, [fetchAttestations]);
  return { attestations, isLoading, error, refetch: fetchAttestations };
}
export function useMyAttestations() {
  const { client, isReady, wallet } = useProgram();
  const [attestations, setAttestations] = useState<Attestation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchMyAttestations = useCallback(async () => {
    if (!client || !isReady || !wallet.publicKey) return;
    setIsLoading(true);
    setError(null);
    try {
      setAttestations(
        await client.fetchAttestationsByCreator(wallet.publicKey)
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch attestations"
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, isReady, wallet.publicKey]);
  useEffect(() => {
    fetchMyAttestations();
  }, [fetchMyAttestations]);
  return { attestations, isLoading, error, refetch: fetchMyAttestations };
}
export function useAttestation(contentHash: string | null) {
  const { client, isReady } = useProgram();
  const [attestation, setAttestation] = useState<Attestation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchAttestation = useCallback(async () => {
    if (!client || !isReady || !contentHash) return;
    setIsLoading(true);
    setError(null);
    try {
      setAttestation(await client.fetchAttestation(contentHash));
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch attestation"
      );
    } finally {
      setIsLoading(false);
    }
  }, [client, isReady, contentHash]);
  useEffect(() => {
    fetchAttestation();
  }, [fetchAttestation]);
  return { attestation, isLoading, error, refetch: fetchAttestation };
}
export function useCreateAttestation() {
  const { client, isReady, initError } = useProgram();
  const [isCreating, setIsCreating] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const createAttestation = useCallback(
    async (
      contentHash: string,
      aiProbability: number,
      contentType: string,
      detectionModel: string,
      metadataUri: string = ""
    ): Promise<string | null> => {
      console.log("useCreateAttestation called", {
        isReady,
        initError,
        hasClient: !!client,
      });

      if (!client) {
        const errMsg = "Program client not initialized";
        console.error(errMsg);
        setError(errMsg);
        return null;
      }

      if (!isReady) {
        const errMsg =
          initError || "Wallet not connected or program not initialized";
        console.error(errMsg);
        setError(errMsg);
        return null;
      }

      setIsCreating(true);
      setError(null);
      setTxSignature(null);

      console.log("Calling client.createAttestation with:", {
        contentHash,
        aiProbability,
        contentType,
        detectionModel,
        metadataUri,
      });

      try {
        const tx = await client.createAttestation(
          contentHash,
          aiProbability,
          contentType,
          detectionModel,
          metadataUri
        );
        console.log("Transaction successful:", tx);
        setTxSignature(tx);
        return tx;
      } catch (err) {
        console.error("createAttestation error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to create attestation"
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [client, isReady]
  );
  return { createAttestation, isCreating, txSignature, error };
}

// Type for detection results
type DetectionResult = TextDetectionResult | ImageDetectionResult;

export function useDetection() {
  const [isDetecting, setIsDetecting] = useState(false);
  const [result, setResult] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const detectText = useCallback(async (text: string) => {
    setIsDetecting(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.text.detect(text);
      setResult(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Detection failed");
      return null;
    } finally {
      setIsDetecting(false);
    }
  }, []);
  const detectImage = useCallback(
    async (file: File, detectionType: ImageDetectionMode = "both") => {
      setIsDetecting(true);
      setError(null);
      setResult(null);
      try {
        const data = await api.image.detect(file, detectionType);
        setResult(data);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Detection failed");
        return null;
      } finally {
        setIsDetecting(false);
      }
    },
    []
  );
  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);
  return { detectText, detectImage, isDetecting, result, error, reset };
}
export function useServiceStatus() {
  const [status, setStatus] = useState<ServiceStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setStatus(await api.system.status());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch status");
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);
  return { status, isLoading, error, refetch: fetchStatus };
}
