"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { cn } from "@/lib/utils";
import {
  Shield,
  Search,
  FileText,
  LayoutDashboard,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/detect", label: "Detect", icon: Search },
  { href: "/attestations", label: "Attestations", icon: FileText },
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
];
export function Header() {
  const pathname = usePathname();
  const { connected } = useWallet();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="p-2 rounded-xl bg-gradient-to-r from-solana-purple to-solana-green">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg hidden sm:block bg-clip-text text-transparent bg-gradient-to-r from-solana-purple via-solana-green to-solana-blue">
              AI Attestation
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-solana-purple/10 text-solana-purple"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="flex items-center gap-4">
            {connected && (
              <div className="hidden sm:flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-solana-green animate-pulse" />
                <span className="text-xs text-gray-500">Connected</span>
              </div>
            )}
            <WalletMultiButton className="!bg-gradient-to-r !from-solana-purple !to-solana-green !rounded-xl !text-sm !font-semibold !h-10" />
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              {mobileMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav className="md:hidden py-4 border-t border-gray-200 dark:border-gray-800">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm fontmedium",
                    isActive
                      ? "bg-solana-purple/10 text-solana-purple"
                      : "text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        )}
      </div>
    </header>
  );
}
export default Header;
