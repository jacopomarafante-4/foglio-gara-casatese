// Uscita dal Portale squadre (logout() in public/portale/js/core.js): toglie la sessione e la tessera del mister
// (lib/mister.ts, cookie che il Portale non può toccare) e torna al PIN
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SQUADRA, createClient } from '@/lib/supabase/server';
import { COOKIE_MISTER } from '@/lib/tessera';
import { COOKIE_PROFILO } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  const risposta = NextResponse.redirect(new URL('/?pin=1&uscito=1', request.url));
  risposta.cookies.delete(COOKIE_MISTER);
  risposta.cookies.delete(COOKIE_SQUADRA);
  risposta.cookies.delete(COOKIE_PROFILO);
  return risposta;
}
