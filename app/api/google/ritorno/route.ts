// Ritorno da Google dopo "Collega a Google Calendar" (solo admin): controlla lo stato, scambia il codice col token di
// rinnovo, lo cifra (SEGRETO_SESSIONE) e lo salva con google_salva (0049), con i calendari proposti dal loro nome.
// Poi si torna al Calendario, dove l'admin conferma o cambia i tre calendari.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { elencoCalendari } from '@/lib/google-calendar';
import { accessoDaRinnovo, COOKIE_STATO, proponiCalendari, scambiaCodice } from '@/lib/google-oauth';
import { cifraTesto } from '@/lib/tessera';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const indietro = (msg: string) => {
    const r = NextResponse.redirect(new URL(`/calendari/tutte?google=${encodeURIComponent(msg)}`, request.url));
    r.cookies.delete({ name: COOKIE_STATO, path: '/api/google' });
    return r;
  };
  const profilo = await getProfilo();
  if (profilo?.ruolo !== 'admin' || !profilo.attivo) return indietro('Solo l’admin collega Google Calendar.');
  if (url.searchParams.get('error')) return indietro('Collegamento annullato su Google.');
  const stato = (await cookies()).get(COOKIE_STATO)?.value;
  if (!stato || stato !== url.searchParams.get('state')) return indietro('Collegamento scaduto: tocca di nuovo “Collega a Google Calendar”.');

  try {
    const { rinnovo } = await scambiaCodice(url.searchParams.get('code') ?? '', new URL('/api/google/ritorno', request.url).toString());
    const cifrato = await cifraTesto(rinnovo);
    if (!cifrato) return indietro('Manca SEGRETO_SESSIONE sul server.');
    const elenco = await elencoCalendari({ token: () => accessoDaRinnovo(rinnovo) });
    const account = elenco.find((c) => c.principale)?.id ?? null;
    const { error } = await (await createClient()).rpc('google_salva', { p_token_cifrato: cifrato, p_account: account, p_calendari: proponiCalendari(elenco) });
    if (error) return indietro(/google_salva/.test(error.message) ? 'Manca la migrazione 0049 nel database.' : error.message);
    return indietro('collegato');
  } catch (e) {
    return indietro(e instanceof Error ? e.message : 'Collegamento non riuscito.');
  }
}
