import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a public key for display (truncated)
 */
export function formatPublicKey(key: string, chars: number = 4): string {
  if (!key) return "";
  if (key.length <= chars * 2 + 3) return key;
  return `${key.slice(0, chars)}...${key.slice(-chars)}`;
}

/**
 * Format a hash for display
 */
export function formatHash(hash: string, chars: number = 8): string {
  if (!hash) return "";
  return `${hash.slice(0, chars)}...`;
}

/**
 * Format timestamp to readable date
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleString();
}

/**
 * Get classification label from AI probability
 */
export function getClassification(aiProbability: number): {
  label: string;
  color: "human" | "ai" | "mixed";
  emoji: string;
} {
  if (aiProbability < 30) {
    return { label: "Human Content", color: "human", emoji: "👤" };
  } else if (aiProbability > 70) {
    return { label: "AI Generated", color: "ai", emoji: "🤖" };
  } else {
    return { label: "Mixed Content", color: "mixed", emoji: "⚡" };
  }
}

/**
 * Content type number to string
 */
export function getContentTypeLabel(type: number): string {
  const types = ["Text", "Image", "Video", "Audio"];
  return types[type] || "Unknown";
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Generate a random ID
 */
export function generateId(): string {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: never[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: never[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Check if a string is a valid Solana public key
 */
export function isValidPublicKey(key: string): boolean {
  try {
    // Basic validation - Solana public keys are 44 characters in base58
    return /^[1-9A-HJ-NP-Za-km-z]{44}$/.test(key);
  } catch {
    return false;
  }
}

/**
 * Format AI probability as percentage
 */
export function formatProbability(probability: number): string {
  return `${(probability / 100).toFixed(1)}%`;
}

/**
 * Get Solana explorer URL
 */
export function getExplorerUrl(
  address: string,
  type: "address" | "tx" = "address",
  cluster: "devnet" | "mainnet-beta" = "devnet"
): string {
  const baseUrl = "https://explorer.solana.com";
  const clusterParam = cluster === "devnet" ? "?cluster=devnet" : "";
  return `${baseUrl}/${type}/${address}${clusterParam}`;
}

/**
 * Validate file type for upload
 */
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.includes(file.type);
}

/**
 * Convert bytes to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Convert hex string to bytes
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Truncate text with ellipsis
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + "...";
}

/**
 * Calculate confidence level from AI probability
 */
export function getConfidenceLevel(probability: number): {
  level: "low" | "medium" | "high";
  label: string;
} {
  if (probability < 20 || probability > 80) {
    return { level: "high", label: "High Confidence" };
  } else if (probability < 40 || probability > 60) {
    return { level: "medium", label: "Medium Confidence" };
  } else {
    return { level: "low", label: "Low Confidence" };
  }
}
