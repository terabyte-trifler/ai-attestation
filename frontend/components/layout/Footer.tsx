"use client";

import React from "react";
import Link from "next/link";
import { Github, Twitter, Globe } from "lucide-react";
export function Footer() {
  return (
    <footer className="border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="col-span-1 md:col-span-2">
            <h3 className="font-bold text-lg bg-clip-text text-transparent bg-gradient-to-r from-solana-purple via-solana-green to-solana-blue mb-2">
              AI Attestation
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md">
              Verify content authenticity with AI detection and permanent
              blockchain attestations on Solana.
            </p>
            <div className="flex gap-4 mt-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Github className="w-5 h-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Twitter className="w-5 h-5" />
              </a>
              <a
                href="https://solana.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              >
                <Globe className="w-5 h-5" />
              </a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              Product
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/detect"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-solana-purple transition-colors"
                >
                  Detect Content
                </Link>
              </li>
              <li>
                <Link
                  href="/attestations"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-solana-purple transition-colors"
                >
                  Browse Attestations
                </Link>
              </li>
              <li>
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-solana-purple transition-colors"
                >
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-sm text-gray-900 dark:text-white mb-4">
              Resources
            </h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="https://docs.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-solana-purple transition-colors"
                >
                  Solana Docs
                </a>
              </li>
              <li>
                <a
                  href="https://explorer.solana.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-solana-purple transition-colors"
                >
                  Explorer
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-800">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} AI Attestation. Built on Solana.
            </p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">Powered by</span>
              <span className="text-xs font-semibold bg-clip-text text-transparent bg-gradient-to-r from-solana-purple to-solana-green">
                Solana
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
export default Footer;
