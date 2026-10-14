import Link from "next/link";
import type { Session } from "@/lib/auth";
import { LogoutButton } from "./AccountForms";
import styles from "./AppHeader.module.css";

export interface Crumb {
  label: string;
  /** Where the crumb goes; the last one (the current page) has none */
  href?: string;
}

// The bar at the top of every page: where you are (Clients > Client > Event), who is logged in, and Log out
export function AppHeader({ session, crumbs }: { session: Session; crumbs: Crumb[] }) {
  return (
    <header className={styles.bar}>
      <nav className={styles.crumbs} aria-label="You are here">
        {crumbs.map((crumb, index) => (
          <span key={index} className={styles.crumb}>
            {index > 0 && <span className={styles.separator}>›</span>}
            {crumb.href ? <Link href={crumb.href}>{crumb.label}</Link> : <strong>{crumb.label}</strong>}
          </span>
        ))}
      </nav>
      <div className={styles.user}>
        <span className="muted">{session.name}</span>
        <LogoutButton />
      </div>
    </header>
  );
}
