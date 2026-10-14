"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { AppSettings } from "@/lib/types";
import styles from "./SettingsForm.module.css";

// `key` is the variable name the row was saved with ("" for a row that is not saved yet).
// It is sent back on save so the server can tell when a variable was renamed.
interface ImpactRow {
  key: string;
  name: string;
  amount: string;
}
interface CustomRow {
  key: string;
  name: string; // the platform's field name, e.g. walking_reason
  label: string;
}

const toKey = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const impactRows = (settings: AppSettings): ImpactRow[] =>
  settings.impacts.map((unit) => ({ key: unit.key, name: unit.name, amount: String(unit.amount) }));
const customRows = (settings: AppSettings): CustomRow[] =>
  settings.customFields.map((field) => ({ key: field.key, name: field.key, label: field.label }));

// The variables of this event that you manage yourself:
//  - impact units: what a donation pays for ("Calls" at $39, "Nights" at $150…)
//  - custom variables: extra fields the fundraising platform stores for each member
export function SettingsForm({ eventId, settings }: { eventId: string; settings: AppSettings }) {
  const router = useRouter();
  const [impacts, setImpacts] = useState(impactRows(settings));
  const [customs, setCustoms] = useState(customRows(settings));
  const [message, setMessage] = useState("");

  // Change one row of a list; used by both lists
  function patch<Row>(rows: Row[], set: (rows: Row[]) => void, index: number, change: Partial<Row>) {
    set(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));
    setMessage("");
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await fetch(`/api/events/${eventId}/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        impacts: impacts.map((row) => ({ key: row.key, name: row.name, amount: Number(row.amount) })),
        customFields: customs,
      }),
    });
    const result = await response.json();
    if (!response.ok) {
      setMessage(result.error ?? "Could not save");
      return;
    }
    setImpacts(impactRows(result as AppSettings));
    setCustoms(customRows(result as AppSettings));
    setMessage("Saved");
    router.refresh(); // redraw the resources with the new settings
  }

  return (
    <form onSubmit={save} className={styles.form}>
      <h3 className={styles.title}>What a donation pays for</h3>
      <p className={styles.help}>
        Each row gives a number for a resource: amount raised ÷ the amount, rounded down. The variable is named after
        the row, so renaming a row renames its variable (designs that use it are updated for you).
      </p>
      <div className={styles.rows}>
        <span className={styles.heading}>Name</span>
        <span className={styles.heading}>Amount for one ($)</span>
        <span className={styles.heading}>Variable to use in a text</span>
        <span />
        {impacts.map((row, index) => (
          // Rows have no id of their own, so their position is used
          <div key={index} className={styles.row}>
            <input
              className={styles.input}
              aria-label="Impact name"
              placeholder="e.g. Nights"
              value={row.name}
              onChange={(event) => patch(impacts, setImpacts, index, { name: event.target.value })}
            />
            <input
              className={styles.input}
              aria-label="Amount for one"
              type="number"
              min="0.01"
              step="0.01"
              value={row.amount}
              onChange={(event) => patch(impacts, setImpacts, index, { amount: event.target.value })}
            />
            <code className={styles.token}>{toKey(row.name) ? `{{impact.${toKey(row.name)}}}` : "type a name"}</code>
            <button
              type="button"
              className={styles.remove}
              onClick={() => {
                setImpacts(impacts.filter((_, i) => i !== index));
                setMessage("");
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`btn btn-small btn-outline ${styles.add}`}
        onClick={() => setImpacts([...impacts, { key: "", name: "", amount: "" }])}
      >
        Add another
      </button>

      <h3 className={styles.title}>Custom variables</h3>
      <p className={styles.help}>
        Extra fields this event collects from each member. The variable name must be the field name exactly as the
        fundraising platform stores it. The label is what you see in the editor.
      </p>
      <div className={styles.rows}>
        <span className={styles.heading}>Label</span>
        <span className={styles.heading}>Variable name</span>
        <span className={styles.heading}>Variable to use in a text</span>
        <span />
        {customs.map((row, index) => (
          <div key={index} className={styles.row}>
            <input
              className={styles.input}
              aria-label="Custom label"
              placeholder="e.g. Connection"
              value={row.label}
              onChange={(event) => patch(customs, setCustoms, index, { label: event.target.value })}
            />
            <input
              className={styles.input}
              aria-label="Custom variable name"
              placeholder="e.g. walking_support"
              value={row.name}
              onChange={(event) =>
                patch(customs, setCustoms, index, { name: event.target.value.replace(/[^A-Za-z0-9_]/g, "") })
              }
            />
            <code className={styles.token}>{row.name ? `{{custom.${row.name}}}` : "type a variable name"}</code>
            <button
              type="button"
              className={styles.remove}
              onClick={() => {
                setCustoms(customs.filter((_, i) => i !== index));
                setMessage("");
              }}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className={`btn btn-small btn-outline ${styles.add}`}
        onClick={() => setCustoms([...customs, { key: "", name: "", label: "" }])}
      >
        Add another
      </button>

      <div className={styles.actions}>
        <button className="btn btn-dark">Save settings</button>
        <span className="muted">{message}</span>
      </div>
    </form>
  );
}
