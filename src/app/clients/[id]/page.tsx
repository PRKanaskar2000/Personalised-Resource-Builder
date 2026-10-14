import Link from "next/link";
import { notFound } from "next/navigation";
import { NewEventForm, RenameEventButton } from "@/components/AccountForms";
import { AppHeader, type Crumb } from "@/components/AppHeader";
import { DeleteButton } from "@/components/DeleteButton";
import { canUseClient } from "@/lib/access";
import { requireSession } from "@/lib/auth";
import { getClient, listEvents } from "@/lib/store";
import styles from "../../account.module.css";

export const dynamic = "force-dynamic";

// One client's events, shown as folders. Opening a folder shows that event's resources.
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  // Another client's page looks exactly like a page that does not exist
  const client = canUseClient(session, id) ? await getClient(id) : null;
  if (!client) notFound();

  const events = await listEvents(client.id);
  const crumbs: Crumb[] =
    session.role === "admin" ? [{ label: "Clients", href: "/" }, { label: client.name }] : [{ label: client.name }];

  return (
    <>
      <AppHeader session={session} crumbs={crumbs} />
      <main className={styles.page}>
        <p className="eyebrow">{client.name}</p>
        <h1 className={`display ${styles.title}`}>Events</h1>
        <p className={styles.intro}>Each event keeps its own resources, images and settings.</p>

        <section className={styles.panel}>
          <NewEventForm clientId={client.id} />
        </section>

        {events.length === 0 && <p className="muted">No events yet. Create the first one above.</p>}
        <div className={styles.folders}>
          {events.map((event) => (
            <article key={event.id} className={styles.folder}>
              <Link href={`/events/${event.id}`} className={styles.folderLink}>
                <span className={styles.folderIcon} aria-hidden />
                <span className={`display ${styles.folderName}`}>{event.name}</span>
                <span className="muted">Created {new Date(event.createdAt).toLocaleDateString("en-AU")}</span>
              </Link>
              <RenameEventButton event={{ id: event.id, name: event.name }} />
              <DeleteButton
                url={`/api/events/${event.id}`}
                name={event.name}
                warning="All of this event's resources, images and download history are deleted too."
                className={styles.folderDelete}
              />
            </article>
          ))}
        </div>
      </main>
    </>
  );
}
