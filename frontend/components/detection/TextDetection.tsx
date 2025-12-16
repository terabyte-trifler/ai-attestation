"use client";

import React, { useState } from "react";
import {
  Button,
  Card,
  CardContent,
  Textarea,
  Badge,
  Progress,
} from "@/components/ui";
import { useDetection, useCreateAttestation } from "@/hooks/useAttestation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  FileText,
  Sparkles,
  Check,
  AlertTriangle,
  Shield,
  ExternalLink,
} from "lucide-react";
import { cn, formatProbability, getExplorerUrl } from "@/lib/utils";
import { TextDetectionResult } from "@/types";
import toast from "react-hot-toast";
export function TextDetection() {
  const [text, setText] = useState("");
  const { connected } = useWallet();
  const { detectText, isDetecting, result, error, reset } = useDetection();
  const {
    createAttestation,
    isCreating,
    txSignature,
    error: attestError,
  } = useCreateAttestation();
  const [attestationComplete, setAttestationComplete] = useState(false);
  const handleDetect = async () => {
    if (text.length < 10) {
      toast.error("Please enter at least 10 characters");
      return;
    }
    reset();
    setAttestationComplete(false);
    await detectText(text);
  };
  const handleAttest = async () => {
    if (!result) return;
    const textResult = result as TextDetectionResult;
    // Generate content hash (in a real app, this would be done server-side)
    const contentHash = btoa(text).slice(0, 32);
    const tx = await createAttestation(
      contentHash,
      textResult.aiProbability,
      "text",
      textResult.detectionModel,
      ""
    );
    if (tx) {
      toast.success("Attestation created!");
      setAttestationComplete(true);
    } else {
      toast.error(attestError || "Failed to create attestation");
    }
  };
  const handleReset = () => {
    setText("");
    reset();
    setAttestationComplete(false);
  };
  const textResult = result as TextDetectionResult | null;
  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
            <FileText className="w-5 h-5" />
            <span className="font-medium">Text Detection</span>
          </div>
          <Textarea
            placeholder="Paste or type text to analyze for AI-generated content..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            className="font-mono text-sm"
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {text.length} characters
            </span>
            <div className="flex gap-3">
              {(result || text) && (
                <Button variant="ghost" onClick={handleReset}>
                  Clear
                </Button>
              )}
              <Button
                onClick={handleDetect}
                isLoading={isDetecting}
                disabled={text.length < 10}
                leftIcon={<Sparkles className="w-4 h-4" />}
              >
                Analyze
              </Button>
            </div>
          </div>
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
      {textResult && (
        <Card className="animate-in">
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Detection Results</h3>
              <Badge variant={textResult.classification}>
                {textResult.classification.toUpperCase()}
              </Badge>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    AI Probability
                  </span>
                  <span
                    className={cn(
                      "font-bold",
                      textResult.aiProbability >= 70
                        ? "text-red-500"
                        : textResult.aiProbability <= 30
                        ? "text-green-500"
                        : "text-yellow-500"
                    )}
                  >
                    {formatProbability(textResult.aiProbability)}
                  </span>
                </div>
                <Progress
                  value={textResult.aiProbability}
                  color={
                    textResult.aiProbability >= 70
                      ? "ai"
                      : textResult.aiProbability <= 30
                      ? "human"
                      : "mixed"
                  }
                />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-gray-600 dark:text-gray-400">
                    Human Probability
                  </span>
                  <span className="font-bold text-green-500">
                    {formatProbability(textResult.humanProbability)}
                  </span>
                </div>
                <Progress value={textResult.humanProbability} color="human" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Model
                </p>
                <p className="font-medium">{textResult.detectionModel}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Confidence
                </p>
                <p className="font-medium">
                  {formatProbability(textResult.confidence)}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 uppercase tracking-wider">
                  Content Hash
                </p>
                <p className="font-mono text-sm break-all">
                  {btoa(text).slice(0, 32)}
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
                    <p className="text-sm text-gray-500">
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
export default TextDetection;
