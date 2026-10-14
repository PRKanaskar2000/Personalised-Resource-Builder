"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Props {
  /** The API address to send DELETE to, e.g. /api/resources/abc */
  url: string;
  /** What is being deleted, for the question: Delete "name"? */
  name: string;
  /** Extra warning shown in the question, e.g. what else is deleted with it */
  warning?: string;
  className?: string;
}

// Deletes a client, event or resource after asking, then reloads the list
export function DeleteButton({ url, name, warning, className = "btn btn-light" }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    const question = `Delete "${name}"?${warning ? `\n${warning}` : ""}\nThis cannot be undone.`;
    if (!window.confirm(question)) return;
    setBusy(true);
    const response = await fetch(url, { method: "DELETE" });
    setBusy(false);
    if (!response.ok) window.alert("Could not delete it. Please try again.");
    router.refresh();
  }

  return (
    <button onClick={() => void remove()} disabled={busy} className={className}>
      {busy ? "Deleting…" : "Delete"}
    </button>
  );
}
