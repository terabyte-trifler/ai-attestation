'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';

/**
 * /analyze route - Redirects to /detect
 * This page exists for SEO and alternative URL access
 */
export default function AnalyzePage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to the main detection page
    router.replace('/detect');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center">
      <div className="animate-pulse">
        <Sparkles className="w-12 h-12 text-solana-purple mb-4 mx-auto" />
      </div>
      <p className="text-gray-500">Redirecting to detection...</p>
    </div>
  );
}