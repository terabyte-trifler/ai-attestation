'use client';

/**
 * Certificate Minting Component
 * 
 * Allows users to mint a cNFT certificate for their attestation
 */

import React, { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { Card, CardContent, Button, Badge, Progress } from '@/components/ui';
import { 
  Award, 
  Sparkles, 
  Check, 
  Loader2, 
  ExternalLink,
  Image as ImageIcon,
  Shield,
  Zap
} from 'lucide-react';
import { cn, getExplorerUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

interface CertificateMintProps {
  attestationPda: string;
  contentHash: string;
  aiProbability: number;
  contentType: string;
  onMinted?: (assetId: string, signature: string) => void;
}

interface CertificateMetadata {
  name: string;
  symbol: string;
  description: string;
  image: string;
  attributes: Array<{ trait_type: string; value: string | number }>;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getClassification(aiProbability: number): string {
  if (aiProbability >= 70) return 'AI Generated';
  if (aiProbability <= 30) return 'Human Created';
  return 'Mixed/Uncertain';
}

function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'AI Generated': return 'text-red-500';
    case 'Human Created': return 'text-green-500';
    default: return 'text-yellow-500';
  }
}

function generateCertificateImage(contentHash: string, classification: string): string {
  // Generate a unique image based on content hash
  const colorMap: Record<string, string> = {
    'AI Generated': 'ef4444',
    'Human Created': '22c55e',
    'Mixed/Uncertain': 'eab308',
  };
  const color = colorMap[classification] || '9945ff';
  return `https://api.dicebear.com/7.x/shapes/svg?seed=${contentHash}&backgroundColor=${color}`;
}

// ============================================================
// COMPONENT
// ============================================================

export function CertificateMint({
  attestationPda,
  contentHash,
  aiProbability,
  contentType,
  onMinted,
}: CertificateMintProps) {
  const { publicKey, signTransaction } = useWallet();
  const { connection } = useConnection();
  
  const [isMinting, setIsMinting] = useState(false);
  const [mintStep, setMintStep] = useState<'idle' | 'preparing' | 'signing' | 'confirming' | 'complete'>('idle');
  const [assetId, setAssetId] = useState<string | null>(null);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const classification = getClassification(aiProbability);

  // Generate certificate preview
  const handlePreview = () => {
    const image = generateCertificateImage(contentHash, classification);
    setPreviewImage(image);
  };

  // Mint the certificate
  const handleMint = async () => {
    if (!publicKey || !signTransaction) {
      toast.error('Please connect your wallet');
      return;
    }

    setIsMinting(true);
    setMintStep('preparing');

    try {
      // Step 1: Prepare metadata
      const metadata: CertificateMetadata = {
        name: `AI Attestation Certificate`,
        symbol: 'AIAC',
        description: `Certificate verifying content analysis. Classification: ${classification}`,
        image: generateCertificateImage(contentHash, classification),
        attributes: [
          { trait_type: 'Classification', value: classification },
          { trait_type: 'AI Probability', value: `${aiProbability.toFixed(1)}%` },
          { trait_type: 'Content Type', value: contentType },
          { trait_type: 'Content Hash', value: contentHash.slice(0, 16) + '...' },
        ],
      };

      // Step 2: Upload metadata (in production, upload to IPFS/Arweave)
      // For demo, we'll use a data URI
      const metadataUri = `data:application/json;base64,${btoa(JSON.stringify(metadata))}`;

      setMintStep('signing');

      // Step 3: Build and sign mint transaction
      // In production, this would call the Bubblegum program via your backend or SDK
      
      // Simulate API call to mint
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setMintStep('confirming');
      
      // Simulate confirmation
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Generate mock asset ID
      const mockAssetId = PublicKey.unique().toBase58();
      const mockSignature = 'mock-sig-' + Date.now().toString(16);

      setAssetId(mockAssetId);
      setTxSignature(mockSignature);
      setMintStep('complete');
      setPreviewImage(metadata.image);

      toast.success('Certificate minted successfully!');
      
      if (onMinted) {
        onMinted(mockAssetId, mockSignature);
      }

    } catch (error) {
      console.error('Minting failed:', error);
      toast.error('Failed to mint certificate');
      setMintStep('idle');
    } finally {
      setIsMinting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-r from-solana-purple/20 to-solana-green/20">
              <Award className="w-6 h-6 text-solana-purple" />
            </div>
            <div>
              <h3 className="font-semibold">Mint Certificate</h3>
              <p className="text-sm text-gray-500">Create a cNFT proof of attestation</p>
            </div>
          </div>
          <Badge variant={aiProbability >= 70 ? 'ai' : aiProbability <= 30 ? 'human' : 'mixed'}>
            {classification}
          </Badge>
        </div>

        {/* Certificate Preview */}
        {(previewImage || mintStep === 'complete') && (
          <div className="relative aspect-square max-w-[200px] mx-auto rounded-xl overflow-hidden border-2 border-gray-200 dark:border-gray-700">
            <img 
              src={previewImage || generateCertificateImage(contentHash, classification)} 
              alt="Certificate Preview"
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
              <p className="text-white text-xs font-medium text-center">
                AI Attestation Certificate
              </p>
            </div>
          </div>
        )}

        {/* Minting Progress */}
        {isMinting && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Minting Progress</span>
              <span className="font-medium">
                {mintStep === 'preparing' && 'Preparing metadata...'}
                {mintStep === 'signing' && 'Sign transaction...'}
                {mintStep === 'confirming' && 'Confirming...'}
              </span>
            </div>
            <Progress 
              value={
                mintStep === 'preparing' ? 25 :
                mintStep === 'signing' ? 50 :
                mintStep === 'confirming' ? 75 :
                100
              }
            />
          </div>
        )}

        {/* Success State */}
        {mintStep === 'complete' && assetId && (
          <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
            <div className="flex items-center gap-2 text-green-600 mb-3">
              <Check className="w-5 h-5" />
              <span className="font-semibold">Certificate Minted!</span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-500">Asset ID:</span>
                <p className="font-mono text-xs break-all">{assetId}</p>
              </div>
              
              {txSignature && (
                <a
                  href={getExplorerUrl(txSignature, 'tx')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-solana-purple hover:underline"
                >
                  View Transaction
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Certificate Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 text-xs mb-1">Type</p>
            <p className="font-medium">Compressed NFT</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800">
            <p className="text-gray-500 text-xs mb-1">Cost</p>
            <p className="font-medium text-green-600">~0.00001 SOL</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-solana-purple/5 to-solana-green/5 border border-solana-purple/20">
          <p className="text-sm font-medium mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-solana-purple" />
            Certificate Benefits
          </p>
          <ul className="text-xs text-gray-600 space-y-1">
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              Permanent on-chain proof of attestation
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              Transferable NFT ownership
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-3 h-3 text-green-500" />
              ~1000x cheaper than regular NFTs
            </li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!previewImage && mintStep === 'idle' && (
            <Button
              variant="outline"
              onClick={handlePreview}
              leftIcon={<ImageIcon className="w-4 h-4" />}
              className="flex-1"
            >
              Preview
            </Button>
          )}
          
          <Button
            onClick={handleMint}
            disabled={isMinting || mintStep === 'complete' || !publicKey}
            isLoading={isMinting}
            leftIcon={mintStep === 'complete' ? <Check className="w-4 h-4" /> : <Award className="w-4 h-4" />}
            className="flex-1"
          >
            {mintStep === 'complete' ? 'Minted!' : 'Mint Certificate'}
          </Button>
        </div>

        {!publicKey && (
          <p className="text-center text-sm text-gray-500">
            Connect your wallet to mint a certificate
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default CertificateMint;