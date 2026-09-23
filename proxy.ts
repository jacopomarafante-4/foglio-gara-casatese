// In Next.js 16 il vecchio "middleware" si chiama "proxy"
import type { NextRequest } from 'next/server';
import { aggiornaSessione } from '@/lib/supabase/sessione';

export async function proxy(request: NextRequest) {
  return aggiornaSessione(request);
}

export const config = {
  // Esclude file statici e immagini
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
