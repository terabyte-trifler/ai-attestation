"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, Badge, EmptyState } from "@/components/ui";
import {
  FileText,
  Image as ImageIcon,
  Shield,
  ExternalLink,
  CheckCircle,
  Clock,
} from "lucide-react";
import { cn, formatHash, getExplorerUrl } from "@/lib/utils";

interface LocalAttestation {
  contentHash: string;
  aiProbability: number;
  contentType: string;
  detectionModel: string;
  metadataUri: string;
  createdAt: string;
  signature: string;
}

// Helper function to format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 2592000)
    return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString();
}

function AttestationCard({ attestation }: { attestation: LocalAttestation }) {
  const isText = attestation.contentType === "text";
  const Icon = isText ? FileText : ImageIcon;
  const classification: "ai" | "human" | "mixed" =
    attestation.aiProbability >= 70
      ? "ai"
      : attestation.aiProbability <= 30
      ? "human"
      : "mixed";

  return (
    <Card hover className="h-full">
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "p-2 rounded-lg",
                isText ? "bg-indigo-500/10" : "bg-green-500/10"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5",
                  isText ? "text-indigo-600" : "text-green-600"
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
            <p className="font-medium truncate">{attestation.detectionModel}</p>
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
            <CheckCircle className="w-4 h-4 text-green-500" />
            Created
          </div>
          <div className="text-xs text-gray-500 font-mono">
            {attestation.signature.slice(0, 16)}...
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
export default function AttestationsPage() {
  const [attestations, setAttestations] = useState<LocalAttestation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load attestations from localStorage
    const stored = localStorage.getItem("attestations");
    if (stored) {
      try {
        setAttestations(JSON.parse(stored));
      } catch (error) {
        console.error("Failed to parse attestations:", error);
      }
    }
    setIsLoading(false);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="text-gradient">Attestations</span>
          </h1>
          <p className="text-gray-600">
            Browse all content attestations created locally
          </p>
        </div>
        <Link
          href="/detect"
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Create New
        </Link>
      </div>

      {!isLoading && attestations.length === 0 && (
        <EmptyState
          icon={<Shield className="w-12 h-12" />}
          title="No attestations yet"
          description="Be the first to create a content attestation."
          action={
            <Link
              href="/detect"
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Create Attestation
            </Link>
          }
        />
      )}

      {attestations.length > 0 && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {attestations.map((attestation) => (
            <AttestationCard
              key={attestation.signature}
              attestation={attestation}
            />
          ))}
        </div>
      )}
    </div>
  );
}
