import { createBrowserClient } from "@supabase/ssr";

// Cliente Supabase pro navegador — usa a anon key (pública, protegida por RLS).
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
