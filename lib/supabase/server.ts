// Client Supabase da usare sul server: pagine, layout, server actions
// Mister con più squadre e un solo PIN (0050): l'intestazione "x-squadra" dice al database quale squadra è aperta
// (team_for_pin la sceglie solo tra quelle del PIN). Di norma è quella scelta (cookie acm_squadra); chi salva un documento
// di una squadra precisa la passa qui.
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cookieDiSessione } from './durata';

export const COOKIE_SQUADRA = 'acm_squadra';

export async function createClient(squadra?: string) {
  const cookieStore = await cookies();
  const scelta = squadra ?? cookieStore.get(COOKIE_SQUADRA)?.value;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(scelta && /^[\w-]+$/.test(scelta) ? { global: { headers: { 'x-squadra': scelta } } } : {}),
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
