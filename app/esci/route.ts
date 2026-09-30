// Uscita (vecchi link e pulsanti "Esci"): toglie la sessione e le tessere di mister e famiglia
// (cookie httpOnly: solo il server li può togliere) e torna al PIN
import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_SQUADRA, createClient } from '@/lib/supabase/server';
import { COOKIE_FAMIGLIA, COOKIE_MISTER } from '@/lib/tessera';
import { COOKIE_PROFILO } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  const risposta = NextResponse.redirect(new URL('/?pin=1&uscito=1', request.url));
  risposta.cookies.delete(COOKIE_MISTER);
  risposta.cookies.delete(COOKIE_FAMIGLIA);
  risposta.cookies.delete(COOKIE_SQUADRA);
  risposta.cookies.delete(COOKIE_PROFILO);
  return risposta;
}
