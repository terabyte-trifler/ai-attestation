'use client';

/**
 * Compare Content Page
 * 
 * Allows users to upload/paste two pieces of content and compare
 * their AI detection results side-by-side.
 */

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, Button, Badge, Progress, Spinner } from '@/components/ui';
import { 
  FileText, 
  Image as ImageIcon, 
  Upload, 
  Sparkles, 
  ArrowRight,
  ArrowLeftRight,
  Check,
  AlertTriangle,
  Trophy,
  Scale,
  X,
  RotateCcw
} from 'lucide-react';
import { cn, formatProbability } from '@/lib/utils';
import { detectText, detectImage } from '@/lib/api/client';
import toast from 'react-hot-toast';

// ============================================================
// TYPES
// ============================================================

type ContentMode = 'text' | 'image';

interface ContentItem {
  id: 'A' | 'B';
  type: ContentMode;
  text?: string;
  image?: File;
  imagePreview?: string;
}

interface DetectionResult {
  aiProbability: number;
  classification: 'ai' | 'human' | 'mixed';
  confidence: number;
  model: string;
  contentHash: string;
}

interface ComparisonResult {
  A: DetectionResult | null;
  B: DetectionResult | null;
  winner: 'A' | 'B' | 'tie' | null;
  difference: number;
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getClassification(probability: number): 'ai' | 'human' | 'mixed' {
  if (probability >= 70) return 'ai';
  if (probability <= 30) return 'human';
  return 'mixed';
}

function getClassificationLabel(classification: string): string {
  switch (classification) {
    case 'ai': return 'AI Generated';
    case 'human': return 'Human Created';
    default: return 'Mixed/Uncertain';
  }
}

function getClassificationColor(classification: string): string {
  switch (classification) {
    case 'ai': return 'text-red-500';
    case 'human': return 'text-green-500';
    default: return 'text-yellow-500';
  }
}

// ============================================================
// CONTENT INPUT COMPONENT
// ============================================================

interface ContentInputProps {
  item: ContentItem;
  mode: ContentMode;
  onTextChange: (text: string) => void;
  onImageChange: (file: File | null, preview: string | null) => void;
  onClear: () => void;
  disabled?: boolean;
}

function ContentInput({ 
  item, 
  mode, 
  onTextChange, 
  onImageChange, 
  onClear,
  disabled 
}: ContentInputProps) {
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const preview = URL.createObjectURL(file);
      onImageChange(file, preview);
    }
  }, [onImageChange]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
    maxFiles: 1,
    disabled,
  });

  const hasContent = mode === 'text' ? !!item.text : !!item.image;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white',
            item.id === 'A' ? 'bg-solana-purple' : 'bg-solana-green'
          )}>
            {item.id}
          </div>
          <span className="font-medium">Content {item.id}</span>
        </div>
        {hasContent && (
          <button 
            onClick={onClear}
            className="text-gray-400 hover:text-gray-600 p-1"
            disabled={disabled}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Input Area */}
      {mode === 'text' ? (
        <textarea
          value={item.text || ''}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={`Paste text ${item.id} here...`}
          className="input min-h-[200px] resize-none font-mono text-sm"
          disabled={disabled}
        />
      ) : (
        <div
          {...getRootProps()}
          className={cn(
            'min-h-[200px] rounded-xl border-2 border-dashed transition-all cursor-pointer',
            'flex flex-col items-center justify-center p-4',
            isDragActive 
              ? 'border-solana-purple bg-solana-purple/5' 
              : 'border-gray-300 hover:border-gray-400',
            disabled && 'opacity-50 cursor-not-allowed',
            item.imagePreview && 'border-solid border-gray-200'
          )}
        >
          <input {...getInputProps()} />
          
          {item.imagePreview ? (
            <div className="relative w-full h-full">
              <img 
                src={item.imagePreview} 
                alt={`Content ${item.id}`}
                className="max-h-[180px] mx-auto rounded-lg object-contain"
              />
            </div>
          ) : (
            <>
              <Upload className={cn(
                'w-8 h-8 mb-2',
                isDragActive ? 'text-solana-purple' : 'text-gray-400'
              )} />
              <p className="text-sm text-gray-500 text-center">
                {isDragActive 
                  ? 'Drop image here...' 
                  : `Drag & drop image ${item.id} or click to browse`
                }
              </p>
            </>
          )}
        </div>
      )}

      {/* Character/File Count */}
      <div className="text-xs text-gray-500 text-right">
        {mode === 'text' 
          ? `${(item.text || '').length} characters`
          : item.image ? item.image.name : 'No file selected'
        }
      </div>
    </div>
  );
}

// ============================================================
// RESULT CARD COMPONENT
// ============================================================

interface ResultCardProps {
  id: 'A' | 'B';
  result: DetectionResult | null;
  isWinner: boolean;
  isLoading: boolean;
}

function ResultCard({ id, result, isWinner, isLoading }: ResultCardProps) {
  if (isLoading) {
    return (
      <Card className="h-full">
        <CardContent className="flex flex-col items-center justify-center h-[250px]">
          <Spinner size="lg" />
          <p className="text-gray-500 mt-4">Analyzing Content {id}...</p>
        </CardContent>
      </Card>
    );
  }

  if (!result) {
    return (
      <Card className="h-full border-dashed">
        <CardContent className="flex flex-col items-center justify-center h-[250px] text-gray-400">
          <Sparkles className="w-8 h-8 mb-2" />
          <p className="text-sm">Results for Content {id}</p>
          <p className="text-xs">will appear here</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(
      'h-full relative overflow-hidden',
      isWinner && 'ring-2 ring-yellow-400'
    )}>
      {isWinner && (
        <div className="absolute top-2 right-2">
          <Badge className="bg-yellow-400 text-yellow-900 flex items-center gap-1">
            <Trophy className="w-3 h-3" />
            More AI
          </Badge>
        </div>
      )}
      
      <CardContent className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-white',
            id === 'A' ? 'bg-solana-purple' : 'bg-solana-green'
          )}>
            {id}
          </div>
          <span className="font-semibold">Content {id}</span>
        </div>

        {/* AI Probability */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">AI Probability</span>
            <span className={cn(
              'text-2xl font-bold',
              getClassificationColor(result.classification)
            )}>
              {result.aiProbability.toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={result.aiProbability} 
            color={result.classification}
            size="lg"
          />
        </div>

        {/* Classification Badge */}
        <div className="flex justify-center">
          <Badge 
            variant={result.classification as any}
            className="text-base px-4 py-1"
          >
            {getClassificationLabel(result.classification)}
          </Badge>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-2 text-sm pt-2 border-t">
          <div>
            <p className="text-gray-500 text-xs">Confidence</p>
            <p className="font-medium">{result.confidence.toFixed(1)}%</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Model</p>
            <p className="font-medium truncate">{result.model}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function ComparePage() {
  // State
  const [mode, setMode] = useState<ContentMode>('text');
  const [contentA, setContentA] = useState<ContentItem>({ id: 'A', type: 'text' });
  const [contentB, setContentB] = useState<ContentItem>({ id: 'B', type: 'text' });
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingA, setLoadingA] = useState(false);
  const [loadingB, setLoadingB] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult>({
    A: null,
    B: null,
    winner: null,
    difference: 0,
  });

  // Check if we can analyze
  const canAnalyze = mode === 'text'
    ? (contentA.text && contentA.text.length >= 10) && (contentB.text && contentB.text.length >= 10)
    : (contentA.image && contentB.image);

  // Handle mode change
  const handleModeChange = (newMode: ContentMode) => {
    setMode(newMode);
    setContentA({ id: 'A', type: newMode });
    setContentB({ id: 'B', type: newMode });
    setComparison({ A: null, B: null, winner: null, difference: 0 });
  };

  // Handle content updates
  const updateContentA = (updates: Partial<ContentItem>) => {
    setContentA(prev => ({ ...prev, ...updates }));
  };

  const updateContentB = (updates: Partial<ContentItem>) => {
    setContentB(prev => ({ ...prev, ...updates }));
  };

  // Clear all
  const handleReset = () => {
    setContentA({ id: 'A', type: mode });
    setContentB({ id: 'B', type: mode });
    setComparison({ A: null, B: null, winner: null, difference: 0 });
  };

  // Analyze both contents
  const handleAnalyze = async () => {
    if (!canAnalyze) return;

    setIsAnalyzing(true);
    setLoadingA(true);
    setLoadingB(true);
    setComparison({ A: null, B: null, winner: null, difference: 0 });

    try {
      // Analyze both in parallel
      const [resultA, resultB] = await Promise.all([
        analyzeContent(contentA),
        analyzeContent(contentB),
      ]);

      setLoadingA(false);
      setLoadingB(false);

      // Determine winner
      let winner: 'A' | 'B' | 'tie' | null = null;
      const difference = Math.abs(resultA.aiProbability - resultB.aiProbability);
      
      if (difference < 5) {
        winner = 'tie';
      } else if (resultA.aiProbability > resultB.aiProbability) {
        winner = 'A';
      } else {
        winner = 'B';
      }

      setComparison({
        A: resultA,
        B: resultB,
        winner,
        difference,
      });

      toast.success('Analysis complete!');

    } catch (error) {
      console.error('Analysis failed:', error);
      toast.error('Failed to analyze content');
      setLoadingA(false);
      setLoadingB(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Analyze a single content item
  const analyzeContent = async (content: ContentItem): Promise<DetectionResult> => {
    if (mode === 'text' && content.text) {
      const result = await detectText(content.text);
      return {
        aiProbability: result.ai_probability,
        classification: getClassification(result.ai_probability),
        confidence: result.confidence,
        model: result.detection_model,
        contentHash: result.content_hash,
      };
    } else if (mode === 'image' && content.image) {
      const result = await detectImage(content.image, 'both');
      return {
        aiProbability: result.combined_probability || result.ai_generated_probability || 50,
        classification: getClassification(result.combined_probability || result.ai_generated_probability || 50),
        confidence: result.confidence || 80,
        model: result.detection_model || 'ensemble',
        contentHash: result.content_hash,
      };
    }
    throw new Error('Invalid content');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-r from-solana-purple/20 to-solana-green/20 mb-4">
          <ArrowLeftRight className="w-8 h-8 text-solana-purple" />
        </div>
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">Compare Content</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload two pieces of content and compare their AI detection results
        </p>
      </div>

      {/* Mode Selector */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
          <button
            onClick={() => handleModeChange('text')}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all',
              mode === 'text' 
                ? 'bg-white shadow-sm text-solana-purple' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <FileText className="w-4 h-4" />
            Text
          </button>
          <button
            onClick={() => handleModeChange('image')}
            className={cn(
              'flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium transition-all',
              mode === 'image' 
                ? 'bg-white shadow-sm text-solana-purple' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            <ImageIcon className="w-4 h-4" />
            Image
          </button>
        </div>
      </div>

      {/* Content Inputs */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardContent>
            <ContentInput
              item={contentA}
              mode={mode}
              onTextChange={(text) => updateContentA({ text })}
              onImageChange={(image, preview) => updateContentA({ image: image || undefined, imagePreview: preview || undefined })}
              onClear={() => setContentA({ id: 'A', type: mode })}
              disabled={isAnalyzing}
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <ContentInput
              item={contentB}
              mode={mode}
              onTextChange={(text) => updateContentB({ text })}
              onImageChange={(image, preview) => updateContentB({ image: image || undefined, imagePreview: preview || undefined })}
              onClear={() => setContentB({ id: 'B', type: mode })}
              disabled={isAnalyzing}
            />
          </CardContent>
        </Card>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mb-8">
        <Button
          variant="ghost"
          onClick={handleReset}
          disabled={isAnalyzing}
          leftIcon={<RotateCcw className="w-4 h-4" />}
        >
          Reset
        </Button>
        <Button
          onClick={handleAnalyze}
          disabled={!canAnalyze || isAnalyzing}
          isLoading={isAnalyzing}
          leftIcon={<Scale className="w-4 h-4" />}
          className="px-8"
        >
          Compare & Analyze
        </Button>
      </div>

      {/* Results Section */}
      {(comparison.A || comparison.B || loadingA || loadingB) && (
        <>
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold">
              <span className="gradient-text">Comparison Results</span>
            </h2>
          </div>

          {/* Results Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <ResultCard 
              id="A" 
              result={comparison.A} 
              isWinner={comparison.winner === 'A'}
              isLoading={loadingA}
            />
            <ResultCard 
              id="B" 
              result={comparison.B} 
              isWinner={comparison.winner === 'B'}
              isLoading={loadingB}
            />
          </div>

          {/* Comparison Summary */}
          {comparison.A && comparison.B && (
            <Card className="bg-gradient-to-r from-solana-purple/5 to-solana-green/5">
              <CardContent className="text-center">
                <h3 className="font-semibold text-lg mb-4">Analysis Summary</h3>
                
                {comparison.winner === 'tie' ? (
                  <div className="flex items-center justify-center gap-3 text-yellow-600">
                    <Scale className="w-6 h-6" />
                    <span className="text-xl font-bold">Too Close to Call!</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-3">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <span className="text-xl font-bold">
                        Content {comparison.winner} is more likely AI-generated
                      </span>
                    </div>
                    <p className="text-gray-600">
                      Difference: <span className="font-bold">{comparison.difference.toFixed(1)}%</span> higher AI probability
                    </p>
                  </div>
                )}

                {/* Visual Comparison Bar */}
                <div className="mt-6 max-w-md mx-auto">
                  <div className="flex items-center gap-4">
                    <div className="flex-1 text-right">
                      <span className={cn(
                        'text-2xl font-bold',
                        getClassificationColor(comparison.A?.classification || 'mixed')
                      )}>
                        {comparison.A?.aiProbability.toFixed(1)}%
                      </span>
                      <p className="text-sm text-gray-500">Content A</p>
                    </div>
                    
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-lg font-bold text-gray-600">VS</span>
                    </div>
                    
                    <div className="flex-1 text-left">
                      <span className={cn(
                        'text-2xl font-bold',
                        getClassificationColor(comparison.B?.classification || 'mixed')
                      )}>
                        {comparison.B?.aiProbability.toFixed(1)}%
                      </span>
                      <p className="text-sm text-gray-500">Content B</p>
                    </div>
                  </div>
                </div>

                {/* Interpretation */}
                <div className="mt-6 p-4 rounded-xl bg-white/50 dark:bg-gray-800/50 text-sm text-gray-600 max-w-lg mx-auto">
                  {comparison.winner === 'tie' ? (
                    <p>
                      Both contents have similar AI detection scores (within 5%). 
                      The difference is not significant enough to determine which is more AI-generated.
                    </p>
                  ) : comparison.winner === 'A' ? (
                    <p>
                      <strong>Content A</strong> shows stronger indicators of AI generation 
                      with a {comparison.difference.toFixed(1)}% higher probability score than Content B.
                    </p>
                  ) : (
                    <p>
                      <strong>Content B</strong> shows stronger indicators of AI generation 
                      with a {comparison.difference.toFixed(1)}% higher probability score than Content A.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Empty State */}
      {!comparison.A && !comparison.B && !loadingA && !loadingB && (
        <Card className="border-dashed">
          <CardContent className="text-center py-12">
            <ArrowLeftRight className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-600 mb-2">Ready to Compare</h3>
            <p className="text-sm text-gray-500 max-w-md mx-auto">
              Add content to both sides above, then click "Compare & Analyze" 
              to see which one is more likely to be AI-generated.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}