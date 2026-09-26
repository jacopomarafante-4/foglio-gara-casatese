import type { SupabaseClient } from '@supabase/supabase-js';
import type { RuoloCampo } from '@/lib/tipi';

export type DatiGiocatore = {
  cognome: string | null;
  nome: string | null;
  descrizione: string | null;
  annata: number;
  ruolo: RuoloCampo | null;
  societaId: string | null;
};

/** Giocatore già in archivio (stesso cognome, nome e annata) o nuovo: niente doppioni.
 *  Restituisce l'id, o un messaggio di errore. */
export async function trovaOCreaGiocatore(supabase: SupabaseClient, g: DatiGiocatore): Promise<{ id?: string; errore?: string }> {
  if (g.cognome) {
    let q = supabase.from('giocatori').select('id').eq('annata', g.annata).ilike('cognome', g.cognome);
    if (g.nome) q = q.ilike('nome', g.nome);
    const { data: trovati } = await q.limit(2);
    if (trovati?.length === 1) return { id: trovati[0].id };
  }
  const { data, error } = await supabase
    .from('giocatori')
    .insert({ cognome: g.cognome, nome: g.nome, descrizione: g.descrizione, annata: g.annata, ruolo: g.ruolo, societa_id: g.societaId })
    .select('id')
    .single();
  if (error || !data) return { errore: error?.message ?? 'errore sconosciuto' };
  return { id: data.id };
}
