import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database";

/**
 * Service-role client that bypasses RLS. Server-only — never import this
 * from a Client Component or expose the service key to the browser.
 * Used by: invitation creation, cron jobs (deadline-scan, weekly-digest),
 * and audit/email log writes.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
