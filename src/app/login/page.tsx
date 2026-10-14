import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AccountForms";
import { getSession } from "@/lib/auth";
import styles from "../account.module.css";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  // Already logged in: go straight to the app
  if (await getSession()) redirect("/");

  return (
    <main className={styles.loginPage}>
      <div className={styles.loginCard}>
        <p className="eyebrow">Fundraising studio</p>
        <h1 className={`display ${styles.loginTitle}`}>Personalised Resource Builder</h1>
        <p className={styles.loginIntro}>Log in to open your events.</p>
        <LoginForm />
      </div>
    </main>
  );
}
