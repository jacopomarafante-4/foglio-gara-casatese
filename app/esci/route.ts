// Uscita dal Portale squadre (logout() in public/portale/js/core.js): toglie la sessione e la tessera del mister
// (lib/mister.ts, cookie che il Portale non può toccare) e torna al PIN
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { COOKIE_MISTER } from '@/lib/tessera';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  const risposta = NextResponse.redirect(new URL('/?pin=1&uscito=1', request.url));
  risposta.cookies.delete(COOKIE_MISTER);
  return risposta;
}
