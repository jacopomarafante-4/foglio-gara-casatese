// Niente accesso automatico: il PIN si rimette quando si chiude il browser
// e comunque dopo ORE_ACCESSO ore (sui telefoni il browser non si chiude quasi mai).
import type { CookieOptions } from '@supabase/ssr';

/** Ore dall'ultimo PIN dopo cui si torna alla pagina d'ingresso (stesso valore in public/portale/js/core.js) */
export const ORE_ACCESSO = 6;

/** Cookie di sessione: @supabase/ssr li farebbe durare 400 giorni, qui spariscono chiudendo il browser */
export function cookieDiSessione(options: CookieOptions): CookieOptions {
  if (options.maxAge === 0) return options; // cancellazione: resta com'è
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { maxAge, expires, ...resto } = options;
  return resto;
}

/** true se l'ultimo accesso (claim `amr` del token: ora del login) è più vecchio di ORE_ACCESSO */
export function accessoScaduto(amr: unknown, adessoSecondi: number) {
  const orari = Array.isArray(amr) ? amr.map((a) => Number(a?.timestamp) || 0) : [];
  const ultimo = Math.max(0, ...orari);
  return adessoSecondi - ultimo > ORE_ACCESSO * 3600;
}
