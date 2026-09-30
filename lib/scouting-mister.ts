// Scouting dei mister nell'app (tappa 3): Segnala, Giocatori, Valuta. I mister non hanno un account: leggono e scrivono con
// le funzioni col PIN della tessera (coach_giocatori, coach_societa, coach_segnala, coach_valuta), come nel Portale.
// Lo staff ha il suo Scouting (/segnala, /giocatori): qui lo si rimanda lì. Solo sul server.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { chiEntra } from '@/lib/portale-dati';
import { etaSquadra } from '@/lib/programma';
import { fineStagione } from '@/lib/categorie';
import type { Mister } from '@/lib/mister';

/** Voti per area (0043: nella segnalazione; le valutazioni vecchie li hanno ancora) */
type VotiArea = {
  tecnica?: number | null; tecnica_note?: string | null; motoria?: number | null; motoria_note?: string | null;
  tattica?: number | null; tattica_note?: string | null; mentale?: number | null; mentale_note?: string | null;
};
export type SegnalazioneMister = VotiArea & {
  data: string; contesto: string | null; testo: string | null; voto: number | null; impressione: string | null; autore: string | null;
};
export type ValutazioneMister = VotiArea & { data: string; contesto: string | null; giudizio: string; commento: string | null; autore: string | null };
/** Un osservato come lo dà coach_giocatori (0043): mai contatti né note */
export type GiocatoreMister = {
  id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number;
  ruolo: string | null; piede: string | null; stato: string; categoria: string | null; societa: string | null;
  segnalazioni: SegnalazioneMister[]; valutazioni: ValutazioneMister[];
};

/** Chi entra nello Scouting dei mister: solo un mister con la tessera (non l'organizzativo, che non ha lo Scouting) */
export async function apriScoutingMister(pagina: 'segnala' | 'giocatori'): Promise<Mister> {
  const chi = await chiEntra();
  if (chi.profilo) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : pagina === 'segnala' ? '/segnala' : '/giocatori');
  if (!chi.mister) redirect('/');
  if (chi.mister.squadra.organizza) redirect('/inizio');
  return chi.mister;
}

/** Annata della squadra (stagione da luglio): null per le squadre senza categoria Under */
export function annataDelMister(mister: Mister): number | null {
  const eta = etaSquadra(mister.squadra);
  return eta < 99 ? fineStagione() - eta : null;
}

/** Osservati dell'annata della squadra (i preparatori: i portieri di tutte le annate); null se non si riesce a leggere */
export async function giocatoriDelMister(mister: Mister): Promise<GiocatoreMister[] | null> {
  const { data, error } = await (await createClient()).rpc('coach_giocatori', { p_pin: mister.pin });
  return error ? null : ((data ?? []) as GiocatoreMister[]);
}

/** Nomi delle società per l'elenco a discesa della segnalazione */
export async function societaDelMister(mister: Mister): Promise<string[]> {
  const { data } = await (await createClient()).rpc('coach_societa', { p_pin: mister.pin });
  return Array.isArray(data) ? (data as string[]) : [];
}

/** Messaggio chiaro per gli errori delle funzioni col PIN */
export function erroreCoach(error: { code?: string; message?: string }, altrimenti: string): string {
  if (error.code === 'PT429') return 'Troppi PIN sbagliati in poco tempo: riprova tra qualche minuto.';
  if (error.code === '28000') return 'PIN della squadra non più valido: rientra dalla pagina d’ingresso.';
  return error.message || altrimenti;
}
