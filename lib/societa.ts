import type { SupabaseClient } from '@supabase/supabase-js';
import { normalizza } from '@/lib/utili';

export type Societa = {
  id: string;
  nome: string;
  alias: string[];
  comune: string | null;
  campo: string | null;
  indirizzo: string | null;
  lat: number | null;
  lon: number | null;
};

export async function elencoSocieta(supabase: SupabaseClient): Promise<Societa[]> {
  const { data } = await supabase
    .from('societa')
    .select('id, nome, alias, comune, campo, indirizzo, lat, lon')
    .order('nome');
  return (data as Societa[]) ?? [];
}

/** La nostra società: i suoi giocatori non compaiono nell'archivio dello scouting, se non con "Tutti i giocatori" */
export const NOSTRA_SOCIETA = 'Academy Casatese Merate';
export function idNostraSocieta(elenco: Societa[]) {
  return elenco.find((s) => s.nome === NOSTRA_SOCIETA)?.id ?? null;
}

/** Cerca per nome o nome alternativo, ignorando maiuscole, spazi e accenti */
export function trovaSocieta(elenco: Societa[], nome: string) {
  const n = normalizza(nome);
  if (!n) return null;
  return elenco.find((s) => normalizza(s.nome) === n || s.alias.some((a) => normalizza(a) === n)) ?? null;
}

/** Restituisce la società esistente o la crea. Aggiorna l'elenco passato. */
export async function trovaOCreaSocieta(
  supabase: SupabaseClient,
  elenco: Societa[],
  nome: string,
): Promise<Societa | null> {
  const esistente = trovaSocieta(elenco, nome);
  if (esistente) return esistente;

  const { data, error } = await supabase
    .from('societa')
    .insert({ nome: nome.trim() })
    .select('id, nome, alias, comune, campo, indirizzo, lat, lon')
    .single();
  if (error || !data) return null;

  elenco.push(data as Societa);
  return data as Societa;
}
