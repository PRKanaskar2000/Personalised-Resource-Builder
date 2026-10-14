import Link from "next/link";
import { redirect } from "next/navigation";
import { EditClientButton, NewClientForm } from "@/components/AccountForms";
import { AppHeader } from "@/components/AppHeader";
import { DeleteButton } from "@/components/DeleteButton";
import { requireSession } from "@/lib/auth";
import { listClients } from "@/lib/store";
import styles from "./account.module.css";

export const dynamic = "force-dynamic";

// The first page after logging in.
//  - A client goes straight to their own events.
//  - The admin sees every client, and creates their logins here.
export default async function StartPage() {
  const session = await requireSession();
  if (session.role === "client") redirect(`/clients/${session.clientId}`);

  const clients = await listClients();

  return (
    <>
      <AppHeader session={session} crumbs={[{ label: "Clients" }]} />
      <main className={styles.page}>
        <h1 className={`display ${styles.title}`}>Clients</h1>
        <p className={styles.intro}>
          Each client logs in with their own username and password, and sees only their own events.
        </p>

        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Add a client</h2>
          <NewClientForm />
        </section>

        {clients.length === 0 && <p className="muted">No clients yet. Add the first one above.</p>}
        <ul className={styles.list}>
          {clients.map((client) => (
            <li key={client.id} className={styles.listRow}>
              <div className={styles.listMain}>
                <Link href={`/clients/${client.id}`} className={`display ${styles.listName}`}>
                  {client.name}
                </Link>
                <p className="muted">Username: {client.username}</p>
              </div>
              <Link href={`/clients/${client.id}`} className="btn btn-small btn-dark">
                Open events
              </Link>
              <EditClientButton client={client} />
              <DeleteButton
                url={`/api/clients/${client.id}`}
                name={client.name}
                warning="All of this client's events, resources and download history are deleted too."
                className="btn btn-small btn-outline"
              />
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
