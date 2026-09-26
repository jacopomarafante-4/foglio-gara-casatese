import type { SupabaseClient } from '@supabase/supabase-js';
import { ETICHETTA_RUOLO, nomeCompleto, type Ruolo } from '@/lib/ruoli';

export type PersonaStaff = { id: string; nome: string };

/** Direttori e scout attivi (e l'admin), per "Affida a" negli incarichi */
export async function staffScouting(supabase: SupabaseClient): Promise<PersonaStaff[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, nome, cognome, email, ruolo')
    .in('ruolo', ['admin', 'direttore', 'scout'])
    .eq('attivo', true);
  return ((data as { id: string; nome: string | null; cognome: string | null; email: string; ruolo: Ruolo }[] | null) ?? [])
    .map((p) => ({ id: p.id, nome: `${nomeCompleto(p.nome || p.cognome ? p : { ...p, nome: ETICHETTA_RUOLO[p.ruolo] })} · ${ETICHETTA_RUOLO[p.ruolo]}` }))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'it'));
}
