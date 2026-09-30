"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { TemplateRecord } from "@/lib/types";

export function NewResourceButton({ templates }: { templates: TemplateRecord[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Untitled resource", templateId: templates[0]?.id }),
    });
    const resource = await response.json();
    router.push(`/editor/${resource.id}`);
  }

  return (
    <button
      onClick={() => void create()}
      disabled={busy}
      className="btn btn-large btn-primary"
    >
      {busy ? "Creating…" : "New resource"}
    </button>
  );
}
