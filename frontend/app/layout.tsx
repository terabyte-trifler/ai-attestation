import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Content Attestation | Verify Content Authenticity",
  description:
    "Detect AI-generated content and create permanent blockchain attestations on Solana. Get collectible cNFT certificates as proof of authenticity.",
  keywords: [
    "AI detection",
    "content verification",
    "Solana",
    "blockchain",
    "GPTZero",
    "NFT certificate",
    "content authenticity",
    "deepfake detection",
  ],
  authors: [{ name: "AI Attestation Team" }],
  creator: "AI Attestation",
  publisher: "AI Attestation",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://ai-attestation.vercel.app",
    title: "AI Content Attestation | Verify Content Authenticity",
    description:
      "Detect AI-generated content and create permanent blockchain attestations on Solana.",
    siteName: "AI Attestation",
  },
  twitter: {
    card: "summary_large_image",
    title: "AI Content Attestation",
    description:
      "Detect AI-generated content and create permanent blockchain attestations on Solana.",
    creator: "@ai_attestation",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased`}
      >
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  );
}
