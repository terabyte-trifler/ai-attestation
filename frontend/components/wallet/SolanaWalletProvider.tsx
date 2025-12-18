"use client";

// ============================================================
// SOLANA WALLET PROVIDER
// ============================================================
// Provides Solana wallet connection and management for the application

import React, { FC, ReactNode, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CoinbaseWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { clusterApiUrl, Connection } from "@solana/web3.js";
import { WalletError } from "@solana/wallet-adapter-base";

// Import wallet adapter styles
import "@solana/wallet-adapter-react-ui/styles.css";

// Dynamically import WalletModalProvider to prevent hydration issues
const WalletModalProvider = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletModalProvider
    ),
  { ssr: false }
);

// ============================================================
// TYPES & CONFIGURATION
// ============================================================

type NetworkType = "devnet" | "mainnet-beta" | "testnet";

// Network configuration
const NETWORK: NetworkType =
  (process.env.NEXT_PUBLIC_SOLANA_NETWORK as NetworkType) || "devnet";
const RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL || clusterApiUrl(NETWORK);

// Connection configuration
const CONNECTION_CONFIG = {
  commitment: "confirmed" as const,
  confirmTransactionInitialTimeout: 60000,
};

interface SolanaWalletProviderProps {
  children: ReactNode;
  /** Optional custom RPC endpoint */
  endpoint?: string;
  /** Whether to auto-connect to wallet */
  autoConnect?: boolean;
  /** Custom error handler */
  onError?: (error: WalletError) => void;
}

// ============================================================
// WALLET PROVIDER COMPONENT
// ============================================================

export const SolanaWalletProvider: FC<SolanaWalletProviderProps> = ({
  children,
  endpoint: customEndpoint,
  autoConnect = true,
  onError,
}) => {
  // Memoize the RPC endpoint
  const endpoint = useMemo(() => {
    return customEndpoint || RPC_URL;
  }, [customEndpoint]);

  // Memoize wallet adapters
  const wallets = useMemo(() => {
    const adapters = [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new TorusWalletAdapter(),
      new LedgerWalletAdapter(),
    ];

    return adapters;
  }, []);

  // Error handler for wallet errors
  const handleError = useCallback(
    (error: WalletError) => {
      console.error("Wallet error:", error);

      if (onError) {
        onError(error);
      } else {
        // Default error handling
        const errorMessage =
          error.message || "An unknown wallet error occurred";

        // You could integrate with a toast library here
        console.warn("Wallet Error:", errorMessage);
      }
    },
    [onError]
  );

  return (
    <ConnectionProvider endpoint={endpoint} config={CONNECTION_CONFIG}>
      <WalletProvider
        wallets={wallets}
        autoConnect={autoConnect}
        onError={handleError}
      >
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

// ============================================================
// UTILITY FUNCTIONS
// ============================================================

/**
 * Get the current network configuration
 */
export const getNetworkConfig = () => ({
  network: NETWORK,
  rpcUrl: RPC_URL,
  isMainnet: NETWORK === "mainnet-beta",
  isDevnet: NETWORK === "devnet",
  isTestnet: NETWORK === "testnet",
});

/**
 * Create a connection instance with the current configuration
 */
export const createConnection = (customEndpoint?: string): Connection => {
  const endpoint = customEndpoint || RPC_URL;
  return new Connection(endpoint, CONNECTION_CONFIG);
};

/**
 * Get explorer URL for the current network
 */
export const getExplorerUrl = (signature: string): string => {
  const baseUrl = "https://explorer.solana.com";
  const cluster = NETWORK === "mainnet-beta" ? "" : `?cluster=${NETWORK}`;
  return `${baseUrl}/tx/${signature}${cluster}`;
};

// Default export
export default SolanaWalletProvider;
