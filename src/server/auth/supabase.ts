import { createClient } from "@supabase/supabase-js";

import { env } from "@/server/env";

export function getSupabaseServerClient() {
  const url = env.NEXT_PUBLIC_SUPABASE_URL || "https://example.supabase.co";
  const key = env.SUPABASE_SERVICE_ROLE_KEY || "development-service-role-key";

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
