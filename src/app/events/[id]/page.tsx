import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader, type Crumb } from "@/components/AppHeader";
import { CopyButton } from "@/components/CopyButton";
import { DeleteButton } from "@/components/DeleteButton";
import { NewResourceButton } from "@/components/NewResourceButton";
import { ResourceCanvas } from "@/components/ResourceCanvas";
import { SettingsForm } from "@/components/SettingsForm";
import { SliderBuilder } from "@/components/SliderBuilder";
import { eventFor } from "@/lib/access";
import { requireSession } from "@/lib/auth";
import { getConnector } from "@/lib/connectors";
import { embedCode } from "@/lib/embed-code";
import { withDerivedValues, withSampleCustomFields } from "@/lib/personalisation";
import { getClient, listClientAssets, listResources, resourceStats } from "@/lib/store";
import styles from "../../home.module.css";

export const dynamic = "force-dynamic";

// Width of a resource thumbnail on this page, in pixels
const THUMB_WIDTH = 320;

// One event: its resources (each opens in the editor) and its settings
export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const event = await eventFor(session, (await params).id);
  if (!event) notFound();

  const [client, resources, fundraisers, images] = await Promise.all([
    getClient(event.clientId),
    listResources(event.id),
    getConnector().listFundraisers(),
    listClientAssets(event.clientId),
  ]);
  const settings = event.settings;
  const stats = await resourceStats(resources.map((resource) => resource.id));
  // This app's own address, for the embed codes (the same address the editor uses)
  const host = (await headers()).get("host");
  const origin = `${host?.startsWith("localhost") ? "http" : "https"}://${host}`;
  // Thumbnails show the dummy values, with calculated values (progress, impact) added
  const sample = fundraisers[0] ? withDerivedValues(withSampleCustomFields(fundraisers[0], settings), settings) : null;

  const clientCrumb = { label: client?.name ?? "Client", href: `/clients/${event.clientId}` };
  const crumbs: Crumb[] =
    session.role === "admin"
      ? [{ label: "Clients", href: "/" }, clientCrumb, { label: event.name }]
      : [clientCrumb, { label: event.name }];

  return (
    <>
      <AppHeader session={session} crumbs={crumbs} />
      <main className={styles.page}>
        <header className={styles.header}>
          <div>
            <p className={styles.kicker}>{client?.name}</p>
            <h1 className={`display ${styles.title}`}>{event.name}</h1>
            <p className={styles.intro}>Design a resource once. Each fundraiser gets their own version.</p>
          </div>
          <div className={styles.actions}>
            <NewResourceButton eventId={event.id} />
            <SliderBuilder
              eventId={event.id}
              resources={resources.map(({ id, name, design }) => ({ id, name, design }))}
              images={images.map(({ id, name, url }) => ({ id, name, url }))}
              sample={sample}
            />
          </div>
        </header>

        {/* Views and downloads of every post, as a sheet for Excel or Google Sheets */}
        <div className={styles.exports}>
          <span className="muted">Export:</span>
          <a href={`/api/events/${event.id}/report`} className="btn btn-small btn-outline">
            Views &amp; downloads per post (CSV)
          </a>
          <a href={`/api/events/${event.id}/report?type=downloads`} className="btn btn-small btn-outline">
            Every download (CSV)
          </a>
        </div>

        <section className={styles.section}>
          <h2 className={`display ${styles.sectionTitle}`}>Resources</h2>
          {resources.length === 0 && <p className="muted">No resources yet. Click New resource to make the first one.</p>}
          <div className={styles.resources}>
            {resources.map((resource) => (
              <article key={resource.id} className={styles.card}>
                <div className={styles.thumb}>
                  <ResourceCanvas
                    design={resource.design}
                    fundraiser={sample}
                    scale={THUMB_WIDTH / resource.design.canvas.width}
                  />
                  {/* Shown on hover (and keyboard focus) */}
                  <div className={styles.overlay}>
                    <Link href={`/editor/${resource.id}`} className="btn btn-primary">
                      Open editor
                    </Link>
                    <DeleteButton
                      url={`/api/resources/${resource.id}`}
                      name={resource.name}
                      warning="Its download history is deleted too."
                    />
                    {/* The Funraisin embed code of this post */}
                    <CopyButton text={embedCode("funraisin", resource.id, resource.design, origin, "")} />
                  </div>
                </div>
                {/* The name is a link too, so the editor can be opened on a phone (no hover there) */}
                <div className={styles.titleRow}>
                  <h3 className={`display ${styles.cardTitle}`}>
                    <Link href={`/editor/${resource.id}`}>{resource.name}</Link>
                  </h3>
                  {/* How often fundraising pages showed this post, and how often it was downloaded */}
                  <p className={styles.stats}>
                    <span title="Times shown on fundraising pages">{stats[resource.id].views} views</span>
                    <span title="Times downloaded">{stats[resource.id].downloads} downloads</span>
                  </p>
                </div>
                <p className={styles.meta}>
                  {resource.design.layers.length} layers
                  {resource.design.show?.enabled ? " · conditional logic" : ""}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={`display ${styles.sectionTitle}`}>Settings for this event</h2>
          <SettingsForm eventId={event.id} settings={settings} />
        </section>
      </main>
    </>
  );
}
