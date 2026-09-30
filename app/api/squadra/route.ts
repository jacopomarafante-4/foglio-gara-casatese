// Mister con più squadre e un solo PIN (0050): "Apri" nel selettore della squadra. Ricorda la scelta nel cookie acm_squadra
// (solo l'id della squadra: lo legge anche il Portale per l'intestazione x-squadra) e torna alla pagina di prima. Si può
// scegliere solo una squadra del proprio PIN: il database, comunque, sceglie solo tra quelle.
import { NextResponse } from 'next/server';
import { getMister } from '@/lib/mister';
import { COOKIE_SQUADRA } from '@/lib/supabase/server';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const scelta = url.searchParams.get('squadra') ?? '';
  // si torna alla pagina da cui si è scelto (stesso sito), senza il vecchio ?squadra=
  const da = request.headers.get('referer');
  let torna = new URL('/squadra/rosa', request.url);
  if (da) { const r = new URL(da); if (r.origin === url.origin) { r.searchParams.delete('squadra'); torna = r; } }
  const risposta = NextResponse.redirect(torna);
  const mister = await getMister();
  if (mister?.squadre.some((t) => t.id === scelta)) {
    risposta.cookies.set(COOKIE_SQUADRA, scelta, { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
  }
  return risposta;
}
