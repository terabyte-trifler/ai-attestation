"use client";

import React from "react";
import Link from "next/link";
import { useAttestations } from "@/hooks/useAttestation";
import { Card, CardContent, Badge, Spinner, EmptyState } from "@/components/ui";
import {
  FileText,
  Image as ImageIcon,
  Shield,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn, formatHash, getExplorerUrl } from "@/lib/utils";
import { Attestation } from "@/lib/solana/program";

// Helper function to format relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
function AttestationCard({ attestation }: { attestation: Attestation }) {
  const isText = attestation.contentType === "text";
  const Icon = isText ? FileText : ImageIcon;
  const classification: "ai" | "human" | "mixed" =
    attestation.aiProbability >= 70
      ? "ai"
      : attestation.aiProbability <= 30
      ? "human"
      : "mixed";
  return (
    <Link href={`/attestation/${attestation.contentHash}`}>
      <Card hover className="h-full">
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "p-2 rounded-lg",
                  isText ? "bg-solana-purple/10" : "bg-solana-green/10"
                )}
              >
                <Icon
                  className={cn(
                    "w-5 h-5",
                    isText ? "text-solana-purple" : "text-solana-green"
                  )}
                />
              </div>
              <div>
                <p className="font-medium text-sm">
                  {attestation.contentType.charAt(0).toUpperCase() +
                    attestation.contentType.slice(1)}
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {formatHash(attestation.contentHash)}
                </p>
              </div>
            </div>
            <Badge variant={classification}>
              {attestation.aiProbability.toFixed(1)}% AI
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Model</p>
              <p className="font-medium truncate">
                {attestation.detectionModel}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Created</p>
              <p className="font-medium">
                {formatRelativeTime(attestation.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {attestation.isVerified ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Verified
                </>
              ) : (
                <>
                  <Clock className="w-4 h-4" />
                  Unverified
                </>
              )}
            </div>
            <a
              href={getExplorerUrl(attestation.publicKey)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-solanapurple hover:underline flex items-center gap-1"
            >
              Explorer <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
export default function AttestationsPage() {
  const { attestations, isLoading, error } = useAttestations();
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Attestations</span>
          </h1>
          <p className="text-gray-600">
            Browse all content attestations on-chain
          </p>
        </div>
        <Link href="/detect" className="btn-solana">
          Create New
        </Link>
      </div>
      {isLoading && (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}
      {error && (
        <Card className="border-red-200">
          <CardContent className="text-center text-red-600">
            {error}
          </CardContent>
        </Card>
      )}
      {!isLoading && !error && attestations.length === 0 && (
        <EmptyState
          icon={<Shield className="w-12 h-12" />}
          title="No attestations yet"
          description="Be the first to create a content attestation."
          action={
            <Link href="/detect" className="btn-solana">
              Create Attestation
            </Link>
          }
        />
      )}
      {!isLoading && attestations.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {attestations.map((attestation) => (
            <AttestationCard
              key={attestation.publicKey}
              attestation={attestation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
