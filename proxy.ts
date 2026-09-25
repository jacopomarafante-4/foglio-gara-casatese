// In Next.js 16 il vecchio "middleware" si chiama "proxy"
import { NextResponse, type NextRequest } from 'next/server';
import { aggiornaSessione } from '@/lib/supabase/sessione';

export async function proxy(request: NextRequest) {
  // Portale squadre: ha un accesso suo (PIN) e va aperto con la barra finale
  if (request.nextUrl.pathname === '/portale') {
    // URL semplice: nextUrl toglierebbe di nuovo la barra finale
    return NextResponse.redirect(new URL(`/portale/${request.nextUrl.search}`, request.url));
  }
  return aggiornaSessione(request);
}

export const config = {
  // Esclude file statici, immagini e i file del Portale squadre (public/portale/)
  matcher: ['/((?!_next/static|_next/image|favicon.ico|portale/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
