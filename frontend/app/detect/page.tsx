"use client";

import React, { useState } from "react";
import { FileText, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import TextDetection from "@/components/detection/TextDetection";
import ImageDetection from "@/components/detection/ImageDetection";

type TabType = "text" | "image";

const tabs: { id: TabType; label: string; icon: React.ElementType }[] = [
  { id: "text", label: "Text", icon: FileText },
  { id: "image", label: "Image", icon: ImageIcon },
];
export default function DetectPage() {
  const [activeTab, setActiveTab] = useState<TabType>("text");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">
          <span className="gradient-text">AI Content Detection</span>
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Analyze text or images for AI-generated content
        </p>
      </div>
      <div className="flex gap-2 mb-8 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all",
                activeTab === tab.id
                  ? "bg-white dark:bg-gray-700 shadow-sm text-solana-purple"
                  : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
              )}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>
      <div className="animate-in">
        {activeTab === "text" ? <TextDetection /> : <ImageDetection />}
      </div>
    </div>
  );
}
