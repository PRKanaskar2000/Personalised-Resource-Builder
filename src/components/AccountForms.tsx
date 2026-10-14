"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./AccountForms.module.css";

// The small forms for logging in and for creating clients and events.
// Each sends JSON to an API route and shows the route's message if something is wrong.

async function send(url: string, method: string, data: unknown) {
  const response = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  return { ok: response.ok, error: (result as { error?: string }).error ?? "Something went wrong. Please try again." };
}

export function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    const result = await send("/api/login", "POST", { username, password });
    if (result.ok) {
      router.push("/");
      router.refresh();
    } else {
      setBusy(false);
      setMessage(result.error);
    }
  }

  return (
    <form onSubmit={submit} className={styles.stack}>
      <label className={styles.label}>
        Username
        <input
          className={styles.input}
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          autoFocus
          required
        />
      </label>
      <label className={styles.label}>
        Password
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          required
        />
      </label>
      <button className="btn btn-large btn-primary" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </button>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </form>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn btn-small btn-outline"
      onClick={async () => {
        await fetch("/api/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}

/** Admin: create a client with their login */
export function NewClientForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await send("/api/clients", "POST", { name, username, password });
    if (!result.ok) return setMessage(result.error);
    setName("");
    setUsername("");
    setPassword("");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={styles.row}>
      <label className={styles.label}>
        Client name
        <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} required />
      </label>
      <label className={styles.label}>
        Username
        <input
          className={styles.input}
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          autoComplete="off"
          required
        />
      </label>
      <label className={styles.label}>
        Password (8+ characters)
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          required
        />
      </label>
      <button className="btn btn-dark">Add client</button>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </form>
  );
}

/** Admin: change a client's name, username or password */
export function EditClientButton({ client }: { client: { id: string; name: string; username: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(client.name);
  const [username, setUsername] = useState(client.username);
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  function start() {
    setName(client.name);
    setUsername(client.username);
    setPassword("");
    setMessage("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await send(`/api/clients/${client.id}`, "PATCH", { name, username, password });
    if (!result.ok) return setMessage(result.error);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className="btn btn-small btn-outline" onClick={start}>
        Edit
      </button>
    );
  }
  return (
    <form onSubmit={submit} className={`${styles.row} ${styles.edit}`}>
      <label className={styles.label}>
        Client name
        <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} autoFocus required />
      </label>
      <label className={styles.label}>
        Username
        <input
          className={styles.input}
          value={username}
          onChange={(event) => setUsername(event.target.value.toLowerCase())}
          autoComplete="off"
          required
        />
      </label>
      <label className={styles.label}>
        New password
        <input
          className={styles.input}
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Leave empty to keep the current one"
          autoComplete="new-password"
        />
      </label>
      <button className="btn btn-dark">Save</button>
      <button type="button" className="btn btn-outline" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </form>
  );
}

/** Rename an event: a small button on its folder that opens a one-field form */
export function RenameEventButton({ event }: { event: { id: string; name: string } }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(event.name);
  const [message, setMessage] = useState("");

  function start() {
    setName(event.name);
    setMessage("");
    setOpen(true);
  }

  async function submit(submitEvent: React.FormEvent) {
    submitEvent.preventDefault();
    const result = await send(`/api/events/${event.id}`, "PATCH", { name });
    if (!result.ok) return setMessage(result.error);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button className={styles.folderRename} onClick={start}>
        Rename
      </button>
    );
  }
  return (
    <form onSubmit={submit} className={styles.folderForm}>
      <input
        className={styles.input}
        aria-label="Event name"
        value={name}
        onChange={(inputEvent) => setName(inputEvent.target.value)}
        maxLength={80}
        autoFocus
        required
      />
      <button className="btn btn-small btn-dark">Save</button>
      <button type="button" className="btn btn-small btn-outline" onClick={() => setOpen(false)}>
        Cancel
      </button>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </form>
  );
}

/** Create an event (a folder) for a client */
export function NewEventForm({ clientId }: { clientId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const result = await send("/api/events", "POST", { clientId, name });
    if (!result.ok) return setMessage(result.error);
    setName("");
    setMessage("");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className={styles.row}>
      <label className={styles.label}>
        New event name
        <input
          className={styles.input}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Designerds Pro 2026"
          required
        />
      </label>
      <button className="btn btn-dark">Create event</button>
      <p className={styles.error} role="alert">
        {message}
      </p>
    </form>
  );
}
