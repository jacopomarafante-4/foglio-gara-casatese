'use server';
// Modulistica (tappa 3): copia nell'Archivio documenti di ogni PDF scaricato (0039, come consegnaPdf() del Portale) e
// salvataggio della distinta.
// Il mister firma col PIN della sua tessera (resta sul server), lo staff col suo account. Se non riesce, il PDF c'è comunque.
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { createClient } from '@/lib/supabase/server';
import type { Distinta, Foglio } from '@/lib/distinta';

export async function archiviaPdf(nome: string, tipo: string, base64: string, squadraId: string | null) {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (!profilo && !mister) return;
  const supabase = await createClient();
  await supabase.rpc('archivia_documento', {
    p_pin: mister?.pin ?? null, p_nome: nome, p_tipo: tipo, p_squadra_id: mister ? null : squadraId, p_dati: base64,
  });
}

/** Distinta: scrive nel foglio della squadra (sheet/<squadra>) solo la distinta e la spunta della categoria, sulla versione
 *  più recente: se nel frattempo il foglio è cambiato (Portale aperto altrove) lo rilegge e riprova. Mister col PIN
 *  (coach_leggi/coach_salva), admin con salva_doc; i direttori sono in sola lettura (RLS, 0011). */
export async function salvaDistinta(squadraId: string, distinta: Distinta, senzaCategoria: boolean): Promise<{ ok: boolean; errore?: string }> {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (!profilo && !mister) return { ok: false, errore: 'Accesso scaduto: rimetti il PIN.' };
  if (profilo && profilo.ruolo !== 'admin') return { ok: false, errore: 'Sola lettura.' };
  const path = 'sheet/' + (mister ? mister.squadra.id : squadraId);
  const supabase = await createClient();
  for (let prova = 0; prova < 3; prova++) {
    let base: Foglio | null, versione: number | null;
    if (mister) {
      const { data, error } = await supabase.rpc('coach_leggi', { p_pin: mister.pin, p_path: path });
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    } else {
      const { data, error } = await supabase.from('docs').select('data, versione').eq('path', path).maybeSingle();
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    }
    const nuovo = { ...(base ?? {}), distinta, senzaCategoria };
    const { data: r, error } = mister
      ? await supabase.rpc('coach_salva', { p_pin: mister.pin, p_path: path, p_data: nuovo, p_versione: versione })
      : await supabase.rpc('salva_doc', { p_path: path, p_data: nuovo, p_versione: versione });
    if (error) return { ok: false, errore: error.message };
    if (r?.ok) return { ok: true };
  }
  return { ok: false, errore: 'Il foglio cambia di continuo: riprova tra poco.' };
}
