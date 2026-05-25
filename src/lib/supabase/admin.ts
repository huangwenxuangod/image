import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const hasSupabaseAdminEnv = Boolean(supabaseUrl) && Boolean(serviceRoleKey);

let adminClient:
  | ReturnType<typeof createClient>
  | null = null;

export function createSupabaseAdminClient() {
  if (!hasSupabaseAdminEnv) {
    return null;
  }

  if (!adminClient) {
    adminClient = createClient(supabaseUrl!, serviceRoleKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return adminClient;
}
