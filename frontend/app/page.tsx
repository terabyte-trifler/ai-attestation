"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  Shield,
  FileCheck,
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  Upload,
  Link as LinkIcon,
} from "lucide-react";
import Link from "next/link";

// Simple Button component since UI components are missing
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: "default" | "sm" | "lg" | "xl";
  variant?: "default" | "outline" | "secondary" | "gradient";
}

const Button = ({
  children,
  size = "default",
  variant = "default",
  className = "",
  ...props
}: ButtonProps) => {
  const baseClasses =
    "inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background";
  const sizeClasses = {
    default: "h-10 py-2 px-4",
    sm: "h-9 px-3 rounded-md",
    lg: "h-11 px-8 rounded-md",
    xl: "h-12 px-10 rounded-md text-lg",
  };
  const variantClasses = {
    default: "bg-primary text-primary-foreground hover:bg-primary/90",
    outline: "border border-input hover:bg-accent hover:text-accent-foreground",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
    gradient:
      "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white hover:opacity-90",
  };

  return (
    <button
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

// Simple Card components
interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

const Card = ({ children, className = "", ...props }: CardProps) => (
  <div
    className={`rounded-lg border bg-card text-card-foreground shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

const CardHeader = ({ children, className = "", ...props }: CardProps) => (
  <div className={`flex flex-col space-y-1.5 p-6 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className = "", ...props }: CardProps) => (
  <h3
    className={`text-2xl font-semibold leading-none tracking-tight ${className}`}
    {...props}
  >
    {children}
  </h3>
);

const CardDescription = ({ children, className = "", ...props }: CardProps) => (
  <p className={`text-sm text-muted-foreground ${className}`} {...props}>
    {children}
  </p>
);

const CardContent = ({ children, className = "", ...props }: CardProps) => (
  <div className={`p-6 pt-0 ${className}`} {...props}>
    {children}
  </div>
);

export default function Home() {
  const { connected } = useWallet();

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-indigo-600" />
            <span className="text-xl font-bold text-gradient">
              AI Attestation
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/verify"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Verify
            </Link>
            <Link
              href="/compare"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Compare
            </Link>
            <a
              href="https://explorer.solana.com"
              target="_blank"
              rel="noopener"
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              Explorer
            </a>
          </nav>
          <WalletMultiButton />
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Sparkles className="h-4 w-4" />
          First Solana-native content attestation
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Verify Content.
          <br />
          <span className="text-gradient">Trust the Blockchain.</span>
        </h1>

        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Detect AI-generated content with 99% accuracy and create permanent,
          tamper-proof attestations on Solana. Get collectible cNFT certificates
          as proof.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/verify">
            <Button size="xl" variant="gradient" className="gap-2">
              Start Verifying <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/compare">
            <Button size="xl" variant="outline" className="gap-2">
              Compare Content
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16 max-w-4xl mx-auto">
          {[
            { label: "Detection Accuracy", value: "99%" },
            { label: "Cost Savings", value: "5000x" },
            { label: "Finality Time", value: "<1 sec" },
            { label: "Certificate Cost", value: "$0.00005" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-indigo-600">
                {stat.value}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="container mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">How It Works</h2>

        <div className="grid md:grid-cols-3 gap-8">
          <Card className="border-2 hover:border-indigo-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center mb-4">
                <Upload className="h-6 w-6 text-indigo-600" />
              </div>
              <CardTitle>1. Upload Content</CardTitle>
              <CardDescription>
                Paste text or upload images. Our AI detects whether content is
                human-created or AI-generated.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-indigo-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center mb-4">
                <FileCheck className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>2. Create Attestation</CardTitle>
              <CardDescription>
                Results are hashed and stored on Solana. ZK Compression makes it
                5000x cheaper than traditional storage.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="border-2 hover:border-indigo-200 transition-colors">
            <CardHeader>
              <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center mb-4">
                <Sparkles className="h-6 w-6 text-purple-600" />
              </div>
              <CardTitle>3. Get Certificate</CardTitle>
              <CardDescription>
                Mint a collectible cNFT certificate as proof. Visible in
                Phantom, Magic Eden, and all Solana wallets.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </section>

      {/* Why Solana */}
      <section className="bg-slate-900 text-white py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">Why Solana?</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Zap,
                title: "ZK Compression",
                desc: "5000x cheaper storage - Solana exclusive technology",
              },
              {
                icon: CheckCircle2,
                title: "Sub-Second Finality",
                desc: "Attestations confirmed in ~400ms, not minutes",
              },
              {
                icon: Sparkles,
                title: "cNFT Certificates",
                desc: "Mint collectible proof for ~$0.00005 each",
              },
              {
                icon: LinkIcon,
                title: "Ecosystem Ready",
                desc: "Integrates with Phantom, Magic Eden, and more",
              },
            ].map((feature) => (
              <div key={feature.title} className="text-center p-6">
                <feature.icon className="h-10 w-10 mx-auto mb-4 text-indigo-400" />
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container mx-auto px-4 py-20 text-center">
        <Card className="max-w-2xl mx-auto bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 border-0 text-white">
          <CardHeader>
            <CardTitle className="text-3xl text-white">
              Ready to Verify?
            </CardTitle>
            <CardDescription className="text-white/80">
              Connect your wallet and start creating permanent content
              attestations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {connected ? (
              <Link href="/verify">
                <Button size="lg" variant="secondary" className="gap-2">
                  Go to Verification <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <WalletMultiButton />
            )}
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            Built for Solana Hackathon 2025 • Powered by ZK Compression &
            Metaplex Bubblegum
          </p>
        </div>
      </footer>
    </main>
  );
}
