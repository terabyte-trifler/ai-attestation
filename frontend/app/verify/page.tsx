"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Progress,
  Spinner,
} from "@/components/ui";
import { useAttestation } from "@/hooks/useAttestation";
import {
  Search,
  Shield,
  CheckCircle,
  XCircle,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  Hash,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { cn, formatPublicKey, getExplorerUrl } from "@/lib/utils";

// Helper function to format date
function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function VerifyPage() {
  const [inputHash, setInputHash] = useState("");
  const [searchHash, setSearchHash] = useState<string | null>(null);
  const { attestation, isLoading, error } = useAttestation(searchHash);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputHash.trim().length >= 16) {
      setSearchHash(inputHash.trim());
    }
  };

  const handleClear = () => {
    setInputHash("");
    setSearchHash(null);
  };

  const classification: "ai" | "human" | "mixed" | null = attestation
    ? attestation.aiProbability >= 70
      ? "ai"
      : attestation.aiProbability <= 30
      ? "human"
      : "mixed"
    : null;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-solana-green/10 mb-4">
          <Shield className="w-8 h-8 text-solana-green" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Verify Attestation</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Enter a content hash to verify its on-chain attestation
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content Hash
              </label>
              <div className="relative">
                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={inputHash}
                  onChange={(e) => setInputHash(e.target.value)}
                  placeholder="Enter SHA-256 content hash (64 characters)..."
                  className="input pl-12 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The content hash is a unique identifier generated from the
                original content
              </p>
            </div>

            <div className="flex gap-3">
              {searchHash && (
                <Button type="button" variant="ghost" onClick={handleClear}>
                  Clear
                </Button>
              )}
              <Button
                type="submit"
                disabled={inputHash.trim().length < 16}
                leftIcon={<Search className="w-4 h-4" />}
                className="flex-1"
              >
                Verify Attestation
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" />
            <p className="text-gray-500 mt-4">Searching blockchain...</p>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="flex items-center gap-4 py-8">
            <div className="p-3 rounded-full bg-red-100 dark:bg-red-900/30">
              <XCircle className="w-6 h-6 text-red-600" />
            </div>
            <div>
              <h3 className="font-semibold text-red-600">
                Attestation Not Found
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                No attestation exists for this content hash on the blockchain.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Result - Attestation Found */}
      {attestation && !isLoading && (
        <div className="space-y-6 animate-in">
          {/* Success Banner */}
          <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
            <CardContent className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-100 dark:bg-green-900/50">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-700 dark:text-green-400">
                  Attestation Verified
                </h3>
                <p className="text-sm text-green-600 dark:text-green-500">
                  This content has a verified on-chain attestation
                </p>
              </div>
              {attestation.isVerified && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Admin Verified
                </Badge>
              )}
            </CardContent>
          </Card>

          {/* Attestation Details */}
          <Card>
            <CardContent className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "p-3 rounded-xl",
                      attestation.contentType === "text"
                        ? "bg-solana-purple/10"
                        : "bg-solana-green/10"
                    )}
                  >
                    {attestation.contentType === "text" ? (
                      <FileText className={cn("w-6 h-6 text-solana-purple")} />
                    ) : (
                      <ImageIcon className={cn("w-6 h-6 text-solana-green")} />
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {attestation.contentType.charAt(0).toUpperCase() +
                        attestation.contentType.slice(1)}{" "}
                      Content
                    </h3>
                    <p className="text-sm text-gray-500">
                      Created {formatDate(attestation.createdAt)}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={classification || "default"}
                  className="text-base px-4 py-1"
                >
                  {attestation.aiProbability.toFixed(1)}% AI
                </Badge>
              </div>

              {/* AI Probability Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    AI Detection Result
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      classification === "ai"
                        ? "text-red-500"
                        : classification === "human"
                        ? "text-green-500"
                        : "text-yellow-500"
                    )}
                  >
                    {classification === "ai" && "Likely AI Generated"}
                    {classification === "human" && "Likely Human Created"}
                    {classification === "mixed" && "Uncertain / Mixed"}
                  </span>
                </div>
                <Progress
                  value={attestation.aiProbability}
                  color={classification || "default"}
                  size="lg"
                />
              </div>

              {/* Details Grid */}
              <div className="grid sm:grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Detection Model
                  </p>
                  <p className="font-medium">{attestation.detectionModel}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Creator
                  </p>
                  <p className="font-mono text-sm">
                    {formatPublicKey(attestation.creator, 6)}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                    Content Hash
                  </p>
                  <p className="font-mono text-sm break-all">
                    {attestation.contentHash}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/attestation/${attestation.contentHash}`}
                  className="btn-solana flex-1 flex items-center justify-center gap-2"
                >
                  View Full Details
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <a
                  href={getExplorerUrl(attestation.publicKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 px-4 py-3 rounded-xl font-semibold border-2 border-gray-300 hover:border-solana-purple transition-colors flex items-center justify-center gap-2"
                >
                  View on Explorer
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* No Search Yet */}
      {!searchHash && !isLoading && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
            <Search className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Enter a Content Hash
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Paste a SHA-256 content hash above to verify if it has an on-chain
            attestation
          </p>

          {/* Quick Links */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/detect"
              className="text-solana-purple hover:underline flex items-center justify-center gap-1"
            >
              <Sparkles className="w-4 h-4" />
              Create New Attestation
            </Link>
            <Link
              href="/attestations"
              className="text-solana-purple hover:underline flex items-center justify-center gap-1"
            >
              <Shield className="w-4 h-4" />
              Browse All Attestations
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
