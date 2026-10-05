import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { COOKIE_MISTER, leggiTessera } from '@/lib/tessera';
import type { Profilo } from '@/lib/ruoli';

/** Doppio ruolo (0050: staff che è anche mister, stesso PIN): "mister" = in questo momento usa l'app come mister */
export const COOKIE_PROFILO = 'acm_profilo';

/** Account dell'utente loggato, qualunque profilo stia usando (una sola query per richiesta) */
export const getAccount = cache(async (): Promise<Profilo | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, nome, cognome, ruolo, annate, attivo, squadre, vedeSegreteria:vede_segreteria')
    .eq('id', user.id)
    .single();

  return (data as Profilo) ?? null;
});

/** Profilo in uso. Null anche quando uno staff con doppio ruolo ha scelto di usare l'app come mister (cookie acm_profilo e
 *  tessera valida): allora per l'app è un mister e basta (lib/mister.ts). L'admin non ha doppio ruolo */
export const getProfilo = cache(async (): Promise<Profilo | null> => {
  const account = await getAccount();
  if (!account || account.ruolo === 'admin') return account;
  const biscotti = await cookies();
  if (biscotti.get(COOKIE_PROFILO)?.value === 'mister' && (await leggiTessera(biscotti.get(COOKIE_MISTER)?.value))) return null;
  return account;
});
