// Preferiti di chi è entrato (0057). Senza la tabella (migrazione non ancora eseguita) restituisce insiemi vuoti.
import type { SupabaseClient } from '@supabase/supabase-js';

export async function mieiPreferiti(supabase: SupabaseClient) {
  const { data, error } = await supabase.from('preferiti').select('gara_id, giocatore_id');
  const righe = error ? [] : (data ?? []);
  return {
    gare: new Set(righe.map((x) => x.gara_id).filter(Boolean) as string[]),
    giocatori: new Set(righe.map((x) => x.giocatore_id).filter(Boolean) as string[]),
  };
}
