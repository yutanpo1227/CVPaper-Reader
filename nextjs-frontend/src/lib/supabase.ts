import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseClientType = SupabaseClient;

let cachedClient: SupabaseClientType | null = null;

export function getSupabaseClient(): SupabaseClientType {
  if (cachedClient) {
    return cachedClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase の URL または anon key が設定されていません。");
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
    },
  });

  return cachedClient;
}
