import { createClient } from "@supabase/supabase-js";

// The connection to the Supabase database and file storage.
// It uses the service_role key from .env.local, which has full access, so this file must only
// ever be used by server code (pages, API routes), never by a component that runs in the browser.

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, then restart the app.");
}

export const supabase = createClient(url, key, {
  // This app has its own login, so Supabase's own sign-in sessions are not used
  auth: { persistSession: false, autoRefreshToken: false },
});

/** The storage bucket that holds uploaded images */
export const UPLOADS_BUCKET = "uploads";
