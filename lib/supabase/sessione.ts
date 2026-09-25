// Usato da proxy.ts: rinnova la sessione e protegge le pagine interne
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { accessoScaduto, cookieDiSessione } from './durata';

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
            response.cookies.set(name, value, cookieDiSessione(options)),
          );
          Object.entries(headers ?? {}).forEach(([k, v]) => response.headers.set(k, v));
        },
      },
    },
  );

  // Verifica il token (non fidarti mai della sola sessione nei cookie)
  const { data } = await supabase.auth.getClaims();
  let loggato = Boolean(data?.claims);

  // Troppo tempo dall'ultimo PIN: si esce e si torna alla pagina d'ingresso
  if (loggato && accessoScaduto(data?.claims.amr, Date.now() / 1000)) {
    await supabase.auth.signOut({ scope: 'local' }); // cancella i cookie dentro `response`
    loggato = false;
  }

  const percorso = request.nextUrl.pathname;
  // La pagina d'ingresso (accesso col PIN) è aperta a tutti
  if (percorso === '/') return response;
  const pubblica = PAGINE_PUBBLICHE.some((p) => percorso.startsWith(p));

  if (!loggato && !pubblica) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = `?next=${encodeURIComponent(percorso)}`;
    return conCookie(NextResponse.redirect(url), response);
  }

  if (loggato && pubblica) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return conCookie(NextResponse.redirect(url), response);
  }

  return response;
}

/** Copia sul redirect i cookie già decisi (sessione rinnovata o cancellata) */
function conCookie(redirect: NextResponse, response: NextResponse) {
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
