import Link from "next/link";
import { listResources, listTemplates } from "@/lib/store";
import { DUMMY_FUNDRAISERS } from "@/lib/connectors/dummy";
import { NewResourceButton } from "@/components/NewResourceButton";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [resources, templates] = await Promise.all([listResources(), listTemplates()]);

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Fundraising studio</p>
          <h1 className={`display ${styles.title}`}>Personalised Resource Builder</h1>
          <p className={styles.intro}>
            Design a resource once. Personalise it for Peter, Alex, Alan and Richi from connected fundraising data —
            then download, render, or embed it.
          </p>
        </div>
        <NewResourceButton templates={templates} />
      </header>

      <section className={styles.section}>
        <h2 className={`display ${styles.sectionTitle}`}>Resources</h2>
        <div className={styles.resources}>
          {resources.map((resource) => (
            <article key={resource.id} className={styles.card}>
              <p className={styles.campaign}>{resource.campaignId}</p>
              <h3 className={`display ${styles.cardTitle}`}>{resource.name}</h3>
              <p className={styles.meta}>{resource.design.layers.length} layers · JSON design</p>
              <div className={styles.actions}>
                <Link href={`/editor/${resource.id}`} className="btn btn-dark">
                  Open editor
                </Link>
                <Link href={`/preview/${resource.id}`} className="btn btn-outline">
                  Dummy user preview
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={`display ${styles.sectionTitle}`}>Connected fundraisers</h2>
        <div className={styles.people}>
          {DUMMY_FUNDRAISERS.map((person) => (
            <article key={person.individual.id} className={styles.person}>
              <h3 className={`display ${styles.personName}`}>{person.individual.firstName}</h3>
              <p className={styles.personStory}>
                {person.activity.type} for {person.relationship.supporting}
              </p>
              <p className={styles.personProgress}>
                {Math.round(person.fundraising.progress * 100)}% of {person.fundraising.goal.toLocaleString()}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
