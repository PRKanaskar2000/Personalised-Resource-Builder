"use client";

import { useState } from "react";

// Copies a text (an embed code) and says "Copied" for a moment
export function CopyButton({ text, label = "Copy code", className = "btn btn-light" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button type="button" onClick={() => void copy()} className={className}>
      {copied ? "Copied" : label}
    </button>
  );
}
