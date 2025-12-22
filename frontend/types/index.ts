// Content Types
export type ContentType = "text" | "image" | "video" | "audio";

export const CONTENT_TYPE_MAP: Record<ContentType, number> = {
  text: 0,
  image: 1,
  video: 2,
  audio: 3,
};

// AI Detection Results
export interface TextDetectionResult {
  aiProbability: number; // 0-100
  humanProbability: number; // 0-100
  classification: "human" | "ai" | "mixed";
  confidence: number; // 0-100
  sentences?: SentenceAnalysis[];
  detectionModel: string;
}

export interface SentenceAnalysis {
  text: string;
  aiProbability: number;
  highlighted: boolean;
}

export interface ImageDetectionResult {
  aiProbability?: number;
  isDeepfake?: boolean;
  sourceModel?: string; // "DALL-E", "Midjourney", etc.
  confidence?: number;
  detectionModel?: string;
  // Fields for "both" mode
  content_type?: string;
  content_hash?: string;
  deepfake_analysis?: {
    probability: number;
    classification: string;
    confidence: number;
    model: string;
  };
  ai_generated_analysis?: {
    probability: number;
    classification: string;
    confidence: number;
    model: string;
  };
  overall?: {
    ai_probability: number;
    classification: string;
    assessment: string;
  };
  // Fields for single mode
  deepfake_probability?: number;
  real_probability?: number;
  ai_probability?: number;
  classification?: string;
  detection_model?: string;
}

// Attestation Types
export interface AttestationData {
  contentHash: string;
  promptHash?: string;
  aiProbability: number;
  contentType: number;
  detectionModel: string;
  metadataUri: string;
}

export interface AttestationResult {
  signature: string;
  contentHash: string;
  aiProbability: number;
  classification: "human" | "ai" | "mixed";
  timestamp: number;
  explorerUrl: string;
}

export interface OnChainAttestation {
  contentHash: Uint8Array;
  promptHash: Uint8Array | null;
  aiProbability: number;
  contentType: number;
  detectionModel: string;
  creator: string;
  timestamp: number;
  metadataUri: string;
  bump: number;
  version: number;
  isVerified: boolean;
  verifiedBy: string | null;
  verifiedAt: number | null;
  cnftAssetId: string | null;
}

// Certificate Types
export interface CertificateData {
  contentHash: string;
  promptHash?: string;
  aiProbability: number;
  classification: "human" | "ai" | "mixed";
  detectionModel: string;
  timestamp: number;
  creator: string;
  transactionSignature: string;
  assetId?: string;
}

export interface MintCertificateResult {
  assetId: string;
  signature: string;
  explorerUrl: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export type DetectApiResponse = ApiResponse<
  TextDetectionResult | ImageDetectionResult
>;
export type AttestApiResponse = ApiResponse<AttestationResult>;
export type MintCertApiResponse = ApiResponse<MintCertificateResult>;

// Verification Status
export type VerificationStatus =
  | "idle"
  | "uploading"
  | "detecting"
  | "hashing"
  | "attesting"
  | "minting"
  | "complete"
  | "error";

// Upload State
export interface UploadState {
  status: VerificationStatus;
  content: string | File | null;
  contentType: ContentType;
  detectionResult: TextDetectionResult | ImageDetectionResult | null;
  attestationResult: AttestationResult | null;
  certificateResult: MintCertificateResult | null;
  error: string | null;
}

// Comparison Types
export interface ComparisonItem {
  id: string;
  content: string | File;
  contentType: ContentType;
  detectionResult: TextDetectionResult | ImageDetectionResult | null;
  isLoading: boolean;
}

export interface ComparisonResult {
  left: ComparisonItem;
  right: ComparisonItem;
  difference: number; // Difference in AI probability
}

// Utility Types
export interface ProgressState {
  step: number;
  total: number;
  message: string;
}

export interface ErrorState {
  code: string;
  message: string;
  details?: string;
}

// Constants
export const AI_PROBABILITY_THRESHOLDS = {
  HUMAN: 30,
  MIXED: 70,
  AI: 100,
} as const;

export const DETECTION_MODELS = {
  TEXT: "desklib-v1.01",
  IMAGE: "deepfake-detector-v2.1",
  UNIFIED: "multi-modal-v1.0",
} as const;
