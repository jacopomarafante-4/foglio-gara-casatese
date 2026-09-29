'use server';
// Modifiche ai documenti del Portale dalle pagine dell'app (tappa 3): voce per voce (per id) in un elenco del documento,
// sulla versione più recente. Se il documento è cambiato nel frattempo (Portale aperto altrove) si rilegge e si riprova:
// così due persone che toccano voci diverse non si cancellano a vicenda. I permessi li decide il database:
// mister con la tessera → coach_leggi/coach_salva (col PIN), admin e direttori → salva_doc (RLS).
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { applicaModifiche, type Modifica } from '@/lib/modifiche';


export async function modificaDoc(path: string, modifiche: Modifica[]): Promise<{ ok: boolean; errore?: string }> {
  if (!/^(calendar|registro)\/[A-Za-z0-9_-]+$|^shared\/(eventi|avvisi)$/.test(path)) return { ok: false, errore: 'Documento non consentito.' };
  const chi = await chiEntra();
  if (!chi.profilo && !chi.mister) return { ok: false, errore: 'Accesso scaduto: rimetti il PIN.' };
  const supabase = await createClient();
  for (let prova = 0; prova < 3; prova++) {
    let base: Record<string, unknown> | null, versione: number | null;
    if (chi.mister) {
      const { data, error } = await supabase.rpc('coach_leggi', { p_pin: chi.mister.pin, p_path: path });
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    } else {
      const { data, error } = await supabase.from('docs').select('data, versione').eq('path', path).maybeSingle();
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    }
    const nuovo = applicaModifiche(base, modifiche);
    const { data: r, error } = chi.mister
      ? await supabase.rpc('coach_salva', { p_pin: chi.mister.pin, p_path: path, p_data: nuovo, p_versione: versione })
      : await supabase.rpc('salva_doc', { p_path: path, p_data: nuovo, p_versione: versione });
    if (error) return { ok: false, errore: /consentito|42501/.test(error.message + error.code) ? 'Non hai il permesso di cambiarlo.' : error.message };
    if (r?.ok) return { ok: true };
  }
  return { ok: false, errore: 'Il documento cambia di continuo: riprova tra poco.' };
}
