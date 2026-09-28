// "Contatto presente" (0037): quali giocatori hanno almeno un contatto (telefono o email) nel database.
// Lo vedono anche gli scout, che i contatti degli altri non li leggono. Senza la migrazione: nessuno.
import type { SupabaseClient } from '@supabase/supabase-js';

export async function conContatto(supabase: SupabaseClient, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const { data, error } = await supabase.rpc('con_contatto', { p_ids: ids });
  if (error || !Array.isArray(data)) return new Set();
  return new Set(data.map((x: string | { con_contatto: string }) => (typeof x === 'string' ? x : x.con_contatto)));
}
