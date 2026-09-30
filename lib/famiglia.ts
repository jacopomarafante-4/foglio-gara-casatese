// Famiglie nell'app (tappa 3; era famiglia.js nel Portale): si entra col PIN del ragazzo (0031) e si vede SOLO lui. La tessera
// (cookie cifrato acm_famiglia, come quella dei mister: lib/tessera.ts) tiene il PIN; i dati arrivano da famiglia_get e si
// scrive solo con famiglia_rispondi, famiglia_contatti, famiglia_carica. Solo sul server.
import { cache } from 'react';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { COOKIE_FAMIGLIA, leggiTessera } from '@/lib/tessera';
import type { Evento, Partita } from '@/lib/programma';

export type Convocazione = Omit<Partita, 'stato'> & { calId?: string | null; meetTime?: string; meetAddress?: string; ll?: string; stato?: string };
export type Quota = { rata?: string; importo?: string; scadenza?: string; pagata?: boolean };
export type DocumentoFamiglia = { id: string; tipo: string; rata: number | null; descrizione?: string; nome_file: string; caricato_il: string; stato: string; nota?: string };
export type DatiFamiglia = {
  ragazzo: { nome?: string; data_nascita?: string; numero?: string | number; giocatore_id?: string; ruolo?: string };
  squadra: { id: string; name?: string; category?: string } | null;
  dati: Record<string, unknown> & { certificato_scadenza?: string; quote?: Quota[]; iscrizione_completa?: boolean; documenti_mancanti?: string };
  calendario: Partita[]; convocazioni: Convocazione[]; avvisi: { id: string; data?: string; titolo?: string; testo: string }[];
  eventi: Evento[]; risposte: Record<string, { risposta: 'si' | 'no'; nota?: string }>; documenti: DocumentoFamiglia[];
};

/** La famiglia entrata (una verifica per richiesta): PIN e dati del ragazzo. Null se non c'è la tessera o il PIN non vale più */
export const getFamiglia = cache(async (): Promise<{ pin: string; f: DatiFamiglia } | null> => {
  const tessera = await leggiTessera((await cookies()).get(COOKIE_FAMIGLIA)?.value);
  if (!tessera) return null;
  const { data, error } = await (await createClient()).rpc('famiglia_get', { p_pin: tessera.pin });
  if (error || !data) return null;
  return { pin: tessera.pin, f: data as DatiFamiglia };
});

/** Chiave della partita per le risposte (come nelle Convocazioni del mister): id del calendario o "data|avversario" */
export const chiavePartita = (c: { calId?: string | null; date?: string; opponent?: string }) => c.calId || `${c.date}|${c.opponent}`;
