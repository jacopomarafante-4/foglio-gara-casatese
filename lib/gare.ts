import type { SupabaseClient } from '@supabase/supabase-js';
import { nomeCompleto } from '@/lib/ruoli';
import { distanzaKm, normalizza } from '@/lib/utili';
import { giocaInGara } from '@/lib/categorie';
import type { StatoGiocatore } from '@/lib/tipi';

type Coord = { lat: number | null; lon: number | null };

export type Sede = { id: number; nome: string; lat: number; lon: number };

export type SquadraSeguita = {
  id: string;
  societa_id: string;
  categoria: string | null;
  motivo: string | null;
  attiva: boolean;
  societa: { nome: string } | null;
};

export type Gara = {
  id: string;
  data_ora: string;
  categoria: string;
  casa_nome: string;
  trasferta_nome: string;
  casa_id: string | null;
  trasferta_id: string | null;
  campo: string | null;
  indirizzo: string | null;
  lat: number | null;
  lon: number | null;
  fonte: string | null;
  /** Dai calendari: 'calendario' finché un comunicato non la conferma o la varia */
  stato: 'calendario' | 'confermata' | 'variata' | null;
  comunicato: string | null;
  ora_da_definire: boolean | null;
  girone: string | null;
  giornata: number | null;
  casa: (Coord & { campo: string | null; indirizzo: string | null }) | null;
  gare_osservatori: {
    profilo_id: string;
    profilo: { nome: string | null; cognome: string | null; email: string } | null;
  }[];
};

/** Giocatore osservato che può giocare in una gara (sua società + categoria compatibile) */
export type GiocatoreInGara = {
  id: string;
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  categoria: string | null;
  societa_id: string | null;
  stato: StatoGiocatore;
};

/** Giocatori segnalati da vedere in questa gara (esclusi quelli già inseriti da noi e quelli da non inserire) */
export function giocatoriDellaGara(g: Pick<Gara, 'categoria' | 'casa_id' | 'trasferta_id'>, giocatori: GiocatoreInGara[]) {
  return giocatori.filter((x) => x.stato !== 'inserito' && x.stato !== 'da_non_inserire' && giocaInGara(x, g));
}

export type GaraArricchita = Gara & {
  /** Giocatori segnalati delle due squadre (solo nel pannello Gare) */
  giocatori?: GiocatoreInGara[];
  distanza: number | null;
  seguite: SquadraSeguita[];
  osservatori: { id: string; nome: string }[];
  mappa: string | null;
};

export const SELECT_GARA =
  'id, data_ora, categoria, casa_nome, trasferta_nome, casa_id, trasferta_id, campo, indirizzo, lat, lon, fonte, ' +
  'stato, comunicato, ora_da_definire, girone, giornata, ' +
  'casa:societa!gare_casa_id_fkey(lat, lon, campo, indirizzo), ' +
  'gare_osservatori(profilo_id, profilo:profiles(nome, cognome, email))';

export async function squadreSeguite(supabase: SupabaseClient) {
  const { data } = await supabase
    .from('squadre_seguite')
    .select('id, societa_id, categoria, motivo, attiva, societa(nome)')
    .order('created_at');
  return (data as unknown as SquadraSeguita[]) ?? [];
}

/** Aggiunge distanza dalla sede, squadre seguite coinvolte, osservatori e link mappa */
export function arricchisci(g: Gara, sede: Sede | null, seguite: SquadraSeguita[]): GaraArricchita {
  const lat = g.lat ?? g.casa?.lat ?? null;
  const lon = g.lon ?? g.casa?.lon ?? null;
  const campo = g.campo ?? g.casa?.campo ?? null;
  const indirizzo = g.indirizzo ?? g.casa?.indirizzo ?? null;

  const cat = normalizza(g.categoria);
  const coinvolte = seguite.filter(
    (s) =>
      s.attiva &&
      (s.societa_id === g.casa_id || s.societa_id === g.trasferta_id) &&
      // "Under 17" segue anche "Under 17 Regionali"
      (!s.categoria || cat.startsWith(normalizza(s.categoria))),
  );

  const mappa =
    lat !== null && lon !== null
      ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
      : indirizzo
        // il nome del campo finisce col paese ("… - CERNUSCO LOMBARDONE"): serve alla ricerca
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([indirizzo, campo?.split(' - ').pop()].filter(Boolean).join(', '))}`
        : null;

  return {
    ...g,
    campo,
    indirizzo,
    distanza: sede && lat !== null && lon !== null ? distanzaKm(sede, { lat, lon }) : null,
    seguite: coinvolte,
    osservatori: g.gare_osservatori.map((o) => ({
      id: o.profilo_id,
      nome: o.profilo ? nomeCompleto(o.profilo) : 'Utente',
    })),
    mappa,
  };
}
