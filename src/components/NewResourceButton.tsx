"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Creates a resource in this event from the default design and opens it in the editor
export function NewResourceButton({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    const response = await fetch("/api/resources", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, name: "Untitled resource" }),
    });
    if (!response.ok) {
      setBusy(false);
      window.alert("Could not create the resource. Please try again.");
      return;
    }
    const resource = await response.json();
    router.push(`/editor/${resource.id}`);
  }

  return (
    <button onClick={() => void create()} disabled={busy} className="btn btn-large btn-primary">
      {busy ? "Creating…" : "New resource"}
    </button>
  );
}
