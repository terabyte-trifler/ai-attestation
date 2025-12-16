"use client";

import React from "react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useMyAttestations } from "@/hooks/useAttestation";
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Spinner,
  EmptyState,
  Progress,
} from "@/components/ui";
import {
  Shield,
  FileText,
  Image as ImageIcon,
  ExternalLink,
  CheckCircle,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn, formatHash } from "@/lib/utils";

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
export default function DashboardPage() {
  const { connected } = useWallet();
  const { attestations, isLoading, error } = useMyAttestations();
  const totalAttestations = attestations.length;
  const verifiedCount = attestations.filter((a) => a.isVerified).length;
  const textCount = attestations.filter((a) => a.contentType === "text").length;
  const imageCount = attestations.filter(
    (a) => a.contentType !== "text"
  ).length;
  const avgAiProbability =
    totalAttestations > 0
      ? attestations.reduce((acc, a) => acc + a.aiProbability, 0) /
        totalAttestations
      : 0;
  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <Wallet className="w-16 h-16 mx-auto text-gray-400 mb-6" />
        <h1 className="text-3xl font-bold mb-4">Connect Your Wallet</h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          Connect your Solana wallet to view your attestations.
        </p>
        <WalletMultiButton />
      </div>
    );
  }
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            <span className="gradient-text">Dashboard</span>
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your content attestations
          </p>
        </div>
        <Link href="/detect" className="btn-solana">
          New Attestation
        </Link>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-solana-purple/10">
              <Shield className="w-6 h-6 text-solana-purple" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalAttestations}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-100">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{verifiedCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Verified
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-100">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{textCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Text</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-100">
              <ImageIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{imageCount}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Images</p>
            </div>
          </CardContent>
        </Card>
      </div>
      {totalAttestations > 0 && (
        <Card className="mb-8">
          <CardContent>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                <span className="font-medium">Average AI Probability</span>
              </div>
              <span
                className={cn(
                  "font-bold text-lg",
                  avgAiProbability >= 70
                    ? "text-red-500"
                    : avgAiProbability <= 30
                    ? "text-green-500"
                    : "text-yellow-500"
                )}
              >
                {avgAiProbability.toFixed(1)}%
              </span>
            </div>
            <Progress
              value={avgAiProbability}
              color={
                avgAiProbability >= 70
                  ? "ai"
                  : avgAiProbability <= 30
                  ? "human"
                  : "mixed"
              }
              size="lg"
            />
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-lg">Your Attestations</h2>
        </CardHeader>
        {isLoading ? (
          <CardContent className="flex justify-center py-8">
            <Spinner />
          </CardContent>
        ) : error ? (
          <CardContent className="text-center text-red-600 py-8">
            {error}
          </CardContent>
        ) : attestations.length === 0 ? (
          <CardContent>
            <EmptyState
              icon={<Shield className="w-12 h-12" />}
              title="No attestations yet"
              action={
                <Link href="/detect" className="btn-solana">
                  Create Attestation
                </Link>
              }
            />
          </CardContent>
        ) : (
          <div className="divide-y divide-gray-100">
            {attestations.map((attestation) => {
              const isText = attestation.contentType === "text";
              const Icon = isText ? FileText : ImageIcon;
              return (
                <Link
                  key={attestation.publicKey}
                  href={`/attestation/${attestation.contentHash}`}
                  className="flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-4">
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
                      <p className="font-medium">
                        {attestation.contentType.charAt(0).toUpperCase() +
                          attestation.contentType.slice(1)}{" "}
                        Content
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {formatHash(attestation.contentHash, 12)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <Badge
                        variant={
                          attestation.aiProbability >= 70
                            ? "ai"
                            : attestation.aiProbability <= 30
                            ? "human"
                            : "mixed"
                        }
                      >
                        {attestation.aiProbability.toFixed(1)}% AI
                      </Badge>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {formatRelativeTime(attestation.createdAt)}
                      </p>
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-400" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
