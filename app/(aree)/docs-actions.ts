'use server';
// Modifiche ai documenti del Portale dalle pagine dell'app (tappa 3), sempre sulla versione più recente: se il documento è
// cambiato nel frattempo (Portale aperto altrove) si rilegge e si riprova, così due persone che toccano parti diverse non si
// cancellano a vicenda. I permessi li decide il database: mister con la tessera → coach_leggi/coach_salva (col PIN),
// admin e direttori → salva_doc (RLS).
import { chiEntra, type Chi } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { applicaModifiche, type Modifica } from '@/lib/modifiche';
import type { Partita } from '@/lib/programma';
import type { Allenamento, Gara, Registro } from '@/lib/registro';

type Doc = Record<string, unknown>;
type Esito<T = undefined> = { ok: boolean; errore?: string; valore?: T };

/** Legge il documento, lo cambia con `cambia` (null = niente da salvare) e lo salva sulla stessa versione; fino a 3 tentativi */
async function aggiorna<T>(chi: Chi, path: string, cambia: (base: Doc | null) => { nuovo: Doc | null; valore?: T }): Promise<Esito<T>> {
  if (!chi.profilo && !chi.mister) return { ok: false, errore: 'Accesso scaduto: rimetti il PIN.' };
  const supabase = await createClient();
  for (let prova = 0; prova < 3; prova++) {
    let base: Doc | null, versione: number | null;
    if (chi.mister) {
      const { data, error } = await supabase.rpc('coach_leggi', { p_pin: chi.mister.pin, p_path: path });
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    } else {
      const { data, error } = await supabase.from('docs').select('data, versione').eq('path', path).maybeSingle();
      if (error) return { ok: false, errore: error.message };
      base = data?.data ?? null; versione = data?.versione ?? null;
    }
    const { nuovo, valore } = cambia(base);
    if (!nuovo) return { ok: true, valore };
    const { data: r, error } = chi.mister
      ? await supabase.rpc('coach_salva', { p_pin: chi.mister.pin, p_path: path, p_data: nuovo, p_versione: versione })
      : await supabase.rpc('salva_doc', { p_path: path, p_data: nuovo, p_versione: versione });
    if (error) return { ok: false, errore: /consentito|42501/.test(error.message + error.code) ? 'Non hai il permesso di cambiarlo.' : error.message };
    if (r?.ok) return { ok: true, valore };
  }
  return { ok: false, errore: 'Il documento cambia di continuo: riprova tra poco.' };
}

const PERCORSO = /^(calendar|registro|roster)\/[A-Za-z0-9_-]+$|^shared\/(eventi|avvisi)$/;

/** Voce per voce (per id) in un elenco del documento: aggiunge, sostituisce o toglie (lib/modifiche.ts) */
export async function modificaDoc(path: string, modifiche: Modifica[]): Promise<Esito> {
  if (!PERCORSO.test(path)) return { ok: false, errore: 'Documento non consentito.' };
  return aggiorna<undefined>(await chiEntra(), path, (base) => ({ nuovo: applicaModifiche(base, modifiche) }));
}

const idNuovo = (p: string) => p + Math.random().toString(36).slice(2, 9);
const squadraOk = (id: string) => /^[A-Za-z0-9_-]+$/.test(id);

/** Home → "Segna le presenze di oggi": l'allenamento di oggi (se manca si crea, tutti presenti come nel Portale); restituisce l'id */
export async function allenamentoDiOggi(squadraId: string, oggi: string, giocatori: string[]): Promise<Esito<string>> {
  if (!squadraOk(squadraId) || !/^\d{4}-\d{2}-\d{2}$/.test(oggi)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'registro/' + squadraId, (base) => {
    const reg = (base ?? {}) as Registro;
    const c = (reg.trainings ?? []).find((t) => t.date === oggi);
    if (c) return { nuovo: null, valore: c.id };
    const t: Allenamento = { id: idNuovo('tr'), date: oggi, note: '', att: Object.fromEntries(giocatori.map((p) => [p, 'P'])) };
    return { nuovo: { ...reg, trainings: [...(reg.trainings ?? []), t] }, valore: t.id };
  });
}

/** Home → "Tabellino da compilare": la partita del registro collegata a quella del calendario (se manca si crea); restituisce l'id */
export async function tabellinoDi(squadraId: string, m: Partita & { id: string }): Promise<Esito<string>> {
  if (!squadraOk(squadraId)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'registro/' + squadraId, (base) => {
    const reg = (base ?? {}) as Registro;
    const c = (reg.games ?? []).find((g) => g.calId === m.id);
    if (c) return { nuovo: null, valore: c.id };
    const g: Gara = { id: idNuovo('gm'), calId: m.id, date: m.date, opponent: m.opponent || '', home: !!m.home, comp: m.friendly ? 'Amichevole' : 'Campionato', dur: 70, og: '', pl: {} };
    return { nuovo: { ...reg, games: [...(reg.games ?? []), g] }, valore: g.id };
  });
}

/** Home → "Prepara la gara" / "Convocazioni": il foglio della squadra passa alla prossima partita (se non è già quella) */
export async function preparaGara(squadraId: string, m: Partita & { ll?: string }): Promise<Esito> {
  if (!squadraOk(squadraId)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'sheet/' + squadraId, (base) => {
    const s = (base ?? {}) as Doc & { date?: string; opponent?: string };
    if (s.date === m.date && (s.opponent || '').trim().toLowerCase() === (m.opponent || '').trim().toLowerCase()) return { nuovo: null };
    return { nuovo: { ...s, opponent: m.opponent || '', date: m.date || '', time: m.time || '', venue: m.venue || '', address: m.address || '',
      venueLL: m.ll || '', home: !!m.home, convType: m.friendly ? 'Amichevole' : 'Campionato' } };
  });
}

/** Rosa → ruolo di un giocatore (registro.ruoli); "portiere" tiene allineato registro.gk (gol subiti), come setRuolo del Portale */
export async function impostaRuolo(squadraId: string, pid: string, ruolo: string): Promise<Esito> {
  if (!squadraOk(squadraId) || !/^[\w-]+$/.test(pid)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'registro/' + squadraId, (base) => {
    const reg = (base ?? {}) as Registro & { ruoli?: Record<string, string> };
    const ruoli = { ...(reg.ruoli ?? {}) };
    if (ruolo) ruoli[pid] = ruolo; else delete ruoli[pid];
    const gk = reg.gk ?? [];
    return { nuovo: { ...reg, ruoli, gk: ruolo === 'portiere' ? [...new Set([...gk, pid])] : gk.filter((x) => x !== pid) } };
  });
}

/** Rosa → elimina un giocatore (solo admin): dalla rosa e da formazione e panchina del foglio della squadra */
export async function eliminaGiocatore(squadraId: string, pid: string): Promise<Esito> {
  if (!squadraOk(squadraId) || !/^[\w-]+$/.test(pid)) return { ok: false, errore: 'Dati non validi.' };
  const chi = await chiEntra();
  const r = await aggiorna<undefined>(chi, 'roster/' + squadraId, (base) => ({ nuovo: applicaModifiche(base, [{ lista: 'players', id: pid, voce: null }]) }));
  if (!r.ok) return r;
  return aggiorna(chi, 'sheet/' + squadraId, (base) => {
    const s = (base ?? {}) as Doc & { lineup?: Record<string, string>; bench?: string[] };
    const inCampo = Object.values(s.lineup ?? {}).includes(pid), inPanchina = (s.bench ?? []).includes(pid);
    if (!inCampo && !inPanchina) return { nuovo: null };
    return { nuovo: { ...s, lineup: Object.fromEntries(Object.entries(s.lineup ?? {}).filter(([, v]) => v !== pid)), bench: (s.bench ?? []).filter((b) => b !== pid) } };
  });
}

/** Campi → posizione esatta del cancello (registro.venues, una per campo): coordinate "lat,lon" o link; null = togli */
export async function impostaCampo(squadraId: string, campo: string, posizione: { ll?: string; url?: string } | null): Promise<Esito> {
  if (!squadraOk(squadraId) || !campo.trim()) return { ok: false, errore: 'Dati non validi.' };
  const chiave = campo.trim().toLowerCase().replace(/\s+/g, ' ');
  return aggiorna(await chiEntra(), 'registro/' + squadraId, (base) => {
    const reg = (base ?? {}) as Doc & { venues?: Record<string, unknown> };
    const venues = { ...(reg.venues ?? {}) };
    if (posizione) venues[chiave] = { name: campo.trim(), ...posizione }; else delete venues[chiave];
    return { nuovo: { ...reg, venues } };
  });
}

/** Foglio della partita (sheet/<squadra>): cambia solo i campi indicati, sulla versione più recente (Dati partita, Convocazioni) */
export async function aggiornaFoglio(squadraId: string, campi: Record<string, unknown>): Promise<Esito> {
  if (!squadraOk(squadraId)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'sheet/' + squadraId, (base) => ({ nuovo: { ...(base ?? {}), ...campi } }));
}

/** Dati partita → "Nuova partita": foglio svuotato (formazione, panchina, convocazioni, dati), restano i piazzati scelti */
export async function svuotaFoglio(squadraId: string, vuoto: Record<string, unknown>): Promise<Esito> {
  if (!squadraOk(squadraId)) return { ok: false, errore: 'Dati non validi.' };
  return aggiorna(await chiEntra(), 'sheet/' + squadraId, (base) => ({ nuovo: { ...vuoto, selected: (base as { selected?: unknown } | null)?.selected ?? [] } }));
}
