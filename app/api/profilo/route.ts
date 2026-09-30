// Doppio ruolo (staff che è anche mister, stesso PIN, 0050): scelta del profilo dall'intestazione.
// ?usa=mister → cookie acm_profilo=mister: per l'app è un mister e basta (lib/auth.ts getProfilo); si passa dal Portale
// col PIN (come all'accesso di un mister), così anche il Portale lavora da mister, e il Portale riporta alla Home.
// ?usa=staff → si toglie il cookie e si torna alla Home da staff.
import { NextResponse } from 'next/server';
import { COOKIE_PROFILO } from '@/lib/auth';
import { getDoppioRuolo, getMister } from '@/lib/mister';

export async function GET(request: Request) {
  const usa = new URL(request.url).searchParams.get('usa');
  const doppio = await getDoppioRuolo();
  const mister = await getMister();
  if (usa === 'mister' && doppio && mister) {
    const r = NextResponse.redirect(new URL(`/portale/#squadra=${encodeURIComponent(mister.pin)}/home`, request.url));
    r.cookies.set(COOKIE_PROFILO, 'mister', { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production' });
    return r;
  }
  const r = NextResponse.redirect(new URL('/inizio', request.url));
  r.cookies.delete(COOKIE_PROFILO);
  return r;
}
