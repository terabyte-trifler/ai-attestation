"use client";

import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import Image from "next/image";
import { Button, Card, CardContent, Badge, Progress } from "@/components/ui";
import { useDetection, useCreateAttestation } from "@/hooks/useAttestation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ImageIcon,
  Upload,
  Sparkles,
  Check,
  AlertTriangle,
  X,
  Shield,
  ExternalLink,
  Eye,
  Bot,
} from "lucide-react";
import {
  cn,
  formatProbability,
  formatFileSize,
  getExplorerUrl,
} from "@/lib/utils";
import { ImageDetectionResult } from "@/types";
import { ImageDetectionMode } from "@/lib/api/client";
import toast from "react-hot-toast";

const detectionModes: {
  value: ImageDetectionMode;
  label: string;
  description: string;
}[] = [
  {
    value: "both",
    label: "Full Analysis",
    description: "Check for deepfakes AND AI-generated images",
  },
  {
    value: "deepfake",
    label: "Deepfake Only",
    description: "Detect manipulated faces",
  },
  {
    value: "ai",
    label: "AI Image Only",
    description: "Detect AI-generated images",
  },
];

// Helper function to read file as data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageDetection() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [detectionMode, setDetectionMode] =
    useState<ImageDetectionMode>("both");
  const { connected } = useWallet();
  const { detectImage, isDetecting, result, error, reset } = useDetection();
  const {
    createAttestation,
    isCreating,
    txSignature,
    error: attestError,
  } = useCreateAttestation();
  const [attestationComplete, setAttestationComplete] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const selectedFile = acceptedFiles[0];
      if (!selectedFile) return;

      if (!selectedFile.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }

      if (selectedFile.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      setFile(selectedFile);
      reset();
      setAttestationComplete(false);
      setPreview(await readFileAsDataURL(selectedFile));
    },
    [reset]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".gif"],
    },
    maxFiles: 1,
  });

  const handleDetect = async () => {
    if (!file) return;
    reset();
    setAttestationComplete(false);
    await detectImage(file, detectionMode);
  };

  const handleAttest = async () => {
    if (!result) return;
    const imageResult = result as ImageDetectionResult;
    // Generate content hash (in a real app, this would be done server-side)
    const contentHash = btoa(file?.name || "image").slice(0, 32);
    const aiProbability = imageResult.aiProbability || 50;

    const tx = await createAttestation(
      contentHash,
      aiProbability,
      "image",
      imageResult.detectionModel,
      ""
    );

    if (tx) {
      toast.success("Attestation created!");
      setAttestationComplete(true);
    } else {
      toast.error(attestError || "Failed to create attestation");
    }
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    reset();
    setAttestationComplete(false);
  };

  const imageResult = result as ImageDetectionResult | null;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Image Detection</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {detectionModes.map((mode) => (
              <button
                key={mode.value}
                onClick={() => setDetectionMode(mode.value)}
                className={cn(
                  "p-3 rounded-xl border-2 text-left transition-all",
                  detectionMode === mode.value
                    ? "border-solana-purple bg-solana-purple/10"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                )}
              >
                <p className="font-medium text-sm">{mode.label}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {mode.description}
                </p>
              </button>
            ))}
          </div>

          {!file ? (
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
                isDragActive
                  ? "border-solana-purple bg-solana-purple/10"
                  : "border-gray-300 dark:border-gray-700 hover:border-solana-purple"
              )}
            >
              <input {...getInputProps()} />
              <Upload className="w-10 h-10 mx-auto text-gray-400 mb-4" />
              {isDragActive ? (
                <p className="text-solana-purple font-medium">
                  Drop image here...
                </p>
              ) : (
                <>
                  <p className="font-medium text-gray-700 dark:text-gray-300">
                    Drag & drop an image
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    or click to browse (JPG, PNG, WebP)
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="relative">
              <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800">
                {preview && (
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                )}
              </div>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="font-medium text-sm truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleClear}>
                    <X className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleDetect}
                    isLoading={isDetecting}
                    leftIcon={<Sparkles className="w-4 h-4" />}
                    size="sm"
                  >
                    Analyze
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="flex items-center gap-3 text-red-600">
            <AlertTriangle className="w-5 h-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {imageResult && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Detection Results</h3>
              <Badge
                variant={
                  imageResult.aiProbability >= 70
                    ? "ai"
                    : imageResult.aiProbability <= 30
                    ? "human"
                    : "mixed"
                }
              >
                {imageResult.aiProbability.toFixed(1)}% AI
              </Badge>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium">AI Detection</span>
                </div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    AI Probability
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      imageResult.aiProbability >= 70
                        ? "text-red-500"
                        : imageResult.aiProbability <= 30
                        ? "text-green-500"
                        : "text-yellow-500"
                    )}
                  >
                    {formatProbability(imageResult.aiProbability)}
                  </span>
                </div>
                <Progress
                  value={imageResult.aiProbability}
                  color={
                    imageResult.aiProbability >= 70
                      ? "ai"
                      : imageResult.aiProbability <= 30
                      ? "human"
                      : "mixed"
                  }
                />
              </div>

              {imageResult.isDeepfake !== undefined && (
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      Deepfake Analysis
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {imageResult.isDeepfake
                      ? "⚠️ Potential deepfake detected"
                      : "✅ No deepfake indicators found"}
                  </p>
                </div>
              )}

              {imageResult.sourceModel && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20">
                  <p className="text-sm font-medium mb-1">Detected Source</p>
                  <p className="text-sm text-blue-600 dark:text-blue-400">
                    {imageResult.sourceModel}
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Model
                </p>
                <p className="font-medium text-sm">
                  {imageResult.detectionModel}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Confidence
                </p>
                <p className="font-medium text-sm">
                  {formatProbability(imageResult.confidence)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Content Hash
                </p>
                <p className="font-mono text-xs break-all">
                  {btoa(file?.name || "image").slice(0, 32)}
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              {!attestationComplete ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Shield className="w-5 h-5" />
                    <span className="text-sm">
                      Create permanent on-chain attestation
                    </span>
                  </div>
                  {connected ? (
                    <Button
                      onClick={handleAttest}
                      isLoading={isCreating}
                      leftIcon={<Check className="w-4 h-4" />}
                    >
                      Create Attestation
                    </Button>
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Connect wallet to create attestation
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center gap-2 text-green-500">
                    <Check className="w-6 h-6" />
                    <span className="font-semibold">Attestation Created!</span>
                  </div>
                  {txSignature && (
                    <a
                      href={getExplorerUrl(txSignature, "tx")}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-solana-purple hover:underline"
                    >
                      View on Explorer
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default ImageDetection;
