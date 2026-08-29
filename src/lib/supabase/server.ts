import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

// Cliente Supabase pro servidor (Server Components, Server Actions, Route
// Handlers). Lê a sessão dos cookies httpOnly — a senha e o token nunca
// passam por JS do navegador além do que o próprio SDK do Supabase já
// controla internamente.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component chamando setAll — ignorado, o middleware
            // já cuida de renovar a sessão nesse caso.
          }
        },
      },
    }
  );
}

// Cliente com a SERVICE ROLE KEY — só pra operações de admin (criar/
// remover usuário). NUNCA importar isso em nada que rode no navegador.
// A chave só existe como variável de ambiente do servidor.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
