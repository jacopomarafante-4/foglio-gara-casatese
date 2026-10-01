// Modifica di un documento del Portale (docs) sulla versione più recente: lo legge, lo cambia e lo salva sulla stessa versione; se
// nel frattempo è cambiato si rilegge e si riprova (fino a 3 volte). Mister con la tessera → coach_leggi/coach_salva (col PIN),
// admin e direttori → salva_doc (RLS). Solo sul server: la usano le azioni di app/(aree)/docs-actions.ts e l'importazione dei calendari.
import type { Chi } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';

type Doc = Record<string, unknown>;
export type Esito<T = undefined> = { ok: boolean; errore?: string; valore?: T };

/** Legge il documento, lo cambia con `cambia` (null = niente da salvare) e lo salva sulla stessa versione; fino a 3 tentativi */
export async function aggiorna<T>(chi: Chi, path: string, cambia: (base: Doc | null) => { nuovo: Doc | null; valore?: T }): Promise<Esito<T>> {
  if (!chi.profilo && !chi.mister) return { ok: false, errore: 'Accesso scaduto: rimetti il PIN.' };
  // squadra del documento (roster/t_u15 → t_u15): il database la usa per scegliere tra le squadre del PIN (0050)
  const squadra = path.match(/^(?:calendar|registro|roster|sheet)\/([\w-]+)$/)?.[1];
  // col PIN: il mister, o lo staff che è anche mister di questa squadra
  const mister = chi.mister ?? (squadra && chi.misterDi?.squadre.some((t) => t.id === squadra) ? chi.misterDi : null);
  const supabase = await createClient(squadra);
  for (let prova = 0; prova < 3; prova++) {
    let base: Doc | null, versione: number | null;
    if (mister) {
      const { data, error } = await supabase.rpc('coach_leggi', { p_pin: mister.pin, p_path: path });
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    } else {
      const { data, error } = await supabase.from('docs').select('data, versione').eq('path', path).maybeSingle();
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    }
    const { nuovo, valore } = cambia(base);
    if (!nuovo) return { ok: true, valore };
    const { data: r, error } = mister
      ? await supabase.rpc('coach_salva', { p_pin: mister.pin, p_path: path, p_data: nuovo, p_versione: versione })
      : await supabase.rpc('salva_doc', { p_path: path, p_data: nuovo, p_versione: versione });
    if (error) return { ok: false, errore: /consentito|42501/.test(error.message + error.code) ? 'Non hai il permesso di cambiarlo.' : error.message };
    if (r?.ok) return { ok: true, valore };
  }
  return { ok: false, errore: 'Il documento cambia di continuo: riprova tra poco.' };
}

