// Usato da proxy.ts: rinnova la sessione e protegge le pagine interne
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const PAGINE_PUBBLICHE = ['/login'];

export async function aggiornaSessione(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Verifica il token (non fidarti mai della sola sessione nei cookie)
  const { data } = await supabase.auth.getClaims();
  const loggato = Boolean(data?.claims);

  const percorso = request.nextUrl.pathname;
  const pubblica = PAGINE_PUBBLICHE.some((p) => percorso.startsWith(p));

  if (!loggato && !pubblica) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = percorso === '/' ? '' : `?next=${encodeURIComponent(percorso)}`;
    return NextResponse.redirect(url);
  }

  if (loggato && pubblica) {
    const url = request.nextUrl.clone();
    url.pathname = '/home';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
