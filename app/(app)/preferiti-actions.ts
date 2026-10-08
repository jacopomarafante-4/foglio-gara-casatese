'use server';
// Stellina dei preferiti (0057): aggiunge o toglie una gara o un giocatore dai preferiti di chi è entrato. Permessi nel database (RLS).
import { createClient } from '@/lib/supabase/server';

export async function cambiaPreferito(tipo: 'gara' | 'giocatore', id: string, attivo: boolean): Promise<{ ok: boolean; errore?: string }> {
  const supabase = await createClient();
  const col = tipo === 'gara' ? 'gara_id' : 'giocatore_id';
  const r = attivo ? await supabase.from('preferiti').insert(tipo === 'gara' ? { gara_id: id } : { giocatore_id: id }) : await supabase.from('preferiti').delete().eq(col, id);
  if (r.error && r.error.code !== '23505') return { ok: false, errore: r.error.message };
  return { ok: true };
}
