// Client Supabase da usare sul server: pagine, layout, server actions
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cookieDiSessione } from './durata';

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
              cookieStore.set(name, value, cookieDiSessione(options)),
            );
          } catch {
            // Chiamato da un Server Component: i cookie li rinnova il proxy
          }
        },
      },
    },
  );
}
