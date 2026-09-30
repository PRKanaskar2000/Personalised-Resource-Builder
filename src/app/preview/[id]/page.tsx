import Link from "next/link";
import { notFound } from "next/navigation";
import { ResourceCanvas } from "@/components/ResourceCanvas";
import { getConnector } from "@/lib/connectors";
import { getResource } from "@/lib/store";
import styles from "./preview.module.css";

export const dynamic = "force-dynamic";

export default async function PreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) notFound();
  const fundraisers = await getConnector().listFundraisers();
  const scale = 280 / resource.design.canvas.width;

  return (
    <main className={styles.page}>
      <Link href="/" className="eyebrow">
        Back
      </Link>
      <h1 className={`display ${styles.title}`}>{resource.name}</h1>
      <p className={styles.intro}>One design JSON, four personalised outputs. No separate artwork per fundraiser.</p>
      <div className={styles.grid}>
        {fundraisers.map((person) => (
          <figure key={person.individual.id} className={styles.card}>
            <ResourceCanvas design={resource.design} fundraiser={person} scale={scale} />
            <figcaption className={styles.caption}>
              <p className={`display ${styles.name}`}>{person.individual.fullName}</p>
              <p className="muted">
                I am {person.activity.type} for {person.relationship.supporting}
              </p>
              <a
                className={styles.svgLink}
                href={`/api/render/${resource.id}?fundraiser=${person.individual.id}&format=svg`}
              >
                Open SVG
              </a>
            </figcaption>
          </figure>
        ))}
      </div>
    </main>
  );
}
