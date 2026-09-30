// "Collega a Google Calendar" (solo admin): manda alla pagina di Google dove si dà il permesso. Un codice casuale in un cookie
// (stato) garantisce che il ritorno (/api/google/ritorno) sia la risposta a questa richiesta e non a un'altra.
import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { getProfilo } from '@/lib/auth';
import { COOKIE_STATO, oauthConfigurato, urlConsenso } from '@/lib/google-oauth';

export async function GET(request: Request) {
  const indietro = (msg: string) => NextResponse.redirect(new URL(`/calendari/tutte?google=${encodeURIComponent(msg)}`, request.url));
  const profilo = await getProfilo();
  if (profilo?.ruolo !== 'admin' || !profilo.attivo) return indietro('Solo l’admin collega Google Calendar.');
  if (!oauthConfigurato()) return indietro('Manca la configurazione dell’app su Google (GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET).');
  const stato = randomBytes(24).toString('hex');
  const risposta = NextResponse.redirect(urlConsenso(new URL('/api/google/ritorno', request.url).toString(), stato));
  risposta.cookies.set(COOKIE_STATO, stato, { httpOnly: true, sameSite: 'lax', path: '/api/google', maxAge: 600, secure: process.env.NODE_ENV === 'production' });
  return risposta;
}
