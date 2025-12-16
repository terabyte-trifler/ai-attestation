"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAttestation } from "@/hooks/useAttestation";
import { Card, CardContent, Badge, Progress, Spinner } from "@/components/ui";
import {
  Shield,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  User,
  Calendar,
  Hash,
  ArrowLeft,
  Copy,
  Check,
} from "lucide-react";
import {
  cn,
  formatPublicKey,
  getExplorerUrl,
  copyToClipboard,
} from "@/lib/utils";
import toast from "react-hot-toast";

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
export default function AttestationDetailPage() {
  const params = useParams();
  const contentHash = params.hash as string;
  const { attestation, isLoading, error } = useAttestation(contentHash);
  const [copied, setCopied] = React.useState<string | null>(null);
  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      setCopied(label);
      toast.success("Copied!");
      setTimeout(() => setCopied(null), 2000);
    }
  };
  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="lg" />
      </div>
    );
  if (error || !attestation) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-24 text-center">
        <Shield className="w-16 h-16 mx-auto text-gray-400 mb-6" />
        <h1 className="text-2xl font-bold mb-4">Attestation Not Found</h1>
        <p className="text-gray-600 mb-8">
          {error || "This attestation does not exist."}
        </p>
        <Link href="/attestations" className="btn-solana">
          Browse Attestations
        </Link>
      </div>
    );
  }
  const isText = attestation.contentType === "text";
  const Icon = isText ? FileText : ImageIcon;
  const classification: "ai" | "human" | "mixed" =
    attestation.aiProbability >= 70
      ? "ai"
      : attestation.aiProbability <= 30
      ? "human"
      : "mixed";
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <Link
        href="/attestations"
        className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Attestations
      </Link>
      <Card className="mb-6">
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "p-4 rounded-2xl",
                  isText ? "bg-solana-purple/10" : "bg-solana-green/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-8 h-8",
                    isText ? "text-solana-purple" : "text-solana-green"
                  )}
                />
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {attestation.contentType.charAt(0).toUpperCase() +
                    attestation.contentType.slice(1)}{" "}
                  Attestation
                </h1>
                <p className="text-gray-500 text-sm">
                  Verified on Solana blockchain
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attestation.isVerified && (
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </Badge>
              )}
              <Badge variant={classification} className="text-base px-4 py-1">
                {attestation.aiProbability.toFixed(1)}% AI
              </Badge>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm text-gray-600">AI Probability</span>
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
                {attestation.aiProbability.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={attestation.aiProbability}
              color={classification}
              size="lg"
            />
          </div>
        </CardContent>
      </Card>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Hash className="w-4 h-4 text-gray-500" />
              Content Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Content Hash
                </p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm break-all flex-1">
                    {attestation.contentHash}
                  </p>
                  <button
                    onClick={() => handleCopy(attestation.contentHash, "hash")}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    {copied === "hash" ? (
                      <Check className="w-4 h-4 text-green-500" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Detection Model
                </p>
                <p className="font-medium">{attestation.detectionModel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Content Type
                </p>
                <Badge>{attestation.contentType}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-gray-500" />
              Creator Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Creator</p>
                <div className="flex items-center gap-2">
                  <p className="font-mono text-sm">
                    {formatPublicKey(attestation.creator, 8)}
                  </p>
                  <a
                    href={getExplorerUrl(attestation.creator)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-solana-purple"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Created At
                </p>
                <p className="font-medium flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {formatDate(attestation.createdAt)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardContent className="space-y-4">
          <h3 className="font-semibold flex items-center gap-2">
            <Shield className="w-4 h-4 text-gray-500" />
            Blockchain Record
          </h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase mb-1">
                Account Address
              </p>
              <div className="flex items-center gap-2">
                <p className="font-mono text-sm">
                  {formatPublicKey(attestation.publicKey, 8)}
                </p>
                <a
                  href={getExplorerUrl(attestation.publicKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-solana-purple"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
            {attestation.cnftAssetId && (
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Certificate NFT
                </p>
                <a
                  href={getExplorerUrl(attestation.cnftAssetId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-solana-purple hover:underline flex items-center gap-1"
                >
                  View Certificate <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
