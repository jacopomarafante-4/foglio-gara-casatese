// Tessera del mister (tappa 3): i mister non hanno un account, entrano col PIN. Per aprire anche le pagine dell'app, al
// momento del PIN il server consegna un cookie cifrato (AES-GCM, chiave da SEGRETO_SESSIONE, solo variabile d'ambiente)
// con dentro il PIN e l'ora dell'accesso. Il cookie non è leggibile dal codice della pagina (httpOnly), sparisce chiudendo
// il browser e vale al massimo ORE_ACCESSO ore. Le pagine lo leggono sul server e chiamano le stesse funzioni coach_*
// del Portale: i permessi restano quelli del database, che ricontrolla il PIN a ogni chiamata.
// Senza SEGRETO_SESSIONE la tessera non si crea: i mister restano nel solo Portale, come prima.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { COOKIE_MISTER, leggiTessera } from '@/lib/tessera';

export { COOKIE_MISTER } from '@/lib/tessera';
export type SquadraMister = {
  id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean;
  coaches?: { id: string; name?: string; eta?: string[] }[];
};
export type Mister = { pin: string; nome: string; squadra: SquadraMister };

/** Mister entrato col PIN (una sola verifica per richiesta): squadra senza PIN e nome, da coach_team. Null se non c'è
 *  la tessera o se il PIN non vale più (cambiato o disattivato in Società) */
export const getMister = cache(async (): Promise<Mister | null> => {
  const tessera = await leggiTessera((await cookies()).get(COOKIE_MISTER)?.value);
  if (!tessera) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('coach_team', { p_pin: tessera.pin });
  if (error || !data) return null;
  const squadra = data as SquadraMister & { mister?: string };
  return { pin: tessera.pin, nome: squadra.mister || 'Mister', squadra };
});
