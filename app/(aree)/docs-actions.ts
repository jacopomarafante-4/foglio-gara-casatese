'use server';
// Modifiche ai documenti del Portale dalle pagine dell'app (tappa 3), sempre sulla versione più recente: se il documento è
// cambiato nel frattempo (Portale aperto altrove) si rilegge e si riprova, così due persone che toccano parti diverse non si
// cancellano a vicenda. I permessi li decide il database: mister con la tessera → coach_leggi/coach_salva (col PIN),
// admin e direttori → salva_doc (RLS).
import { randomInt } from 'node:crypto';
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { aggiorna } from '@/lib/aggiorna-doc';
import { confronta, leggiBackup, type Confronto } from '@/lib/ripristino';
import { applicaModifiche, type Modifica } from '@/lib/modifiche';
import type { Partita } from '@/lib/programma';
import type { Allenamento, Gara, Registro } from '@/lib/registro';
import { applicaOpSquadre, chiaveNome, senzaSpazi, type OpSquadre, type SquadraSocieta } from '@/lib/squadre-societa';

type Doc = Record<string, unknown>;
type Esito<T = undefined> = { ok: boolean; errore?: string; valore?: T };

const PERCORSO = /^(calendar|registro|roster)\/[A-Za-z0-9_-]+$|^shared\/(eventi|avvisi|schemes)$/;   // shared/schemes: solo l'admin (RLS)

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

/** Rosa → preparatori dei portieri: segna o toglie "portiere" a un giocatore di un'altra squadra (coach_portiere, 0050) */
export async function segnaPortiere(squadraId: string, pid: string, portiere: boolean): Promise<Esito> {
  if (!squadraOk(squadraId) || !/^[\w-]+$/.test(pid)) return { ok: false, errore: 'Dati non validi.' };
  const chi = await chiEntra();
  if (!chi.mister?.squadra.vedeTutte) return { ok: false, errore: 'Solo i preparatori dei portieri.' };
  const { error } = await (await createClient()).rpc('coach_portiere', { p_pin: chi.mister.pin, p_squadra: squadraId, p_giocatore: pid, p_portiere: portiere });
  return error ? { ok: false, errore: error.message } : { ok: true };
}

/** Allenamento → Presenze, preparatore su un'altra squadra (0053): presenza di un SUO portiere ('' = toglie).
 *  Il database (coach_presenza_portiere) ricontrolla che sia tra le sue categorie e che il giocatore sia un portiere. */
export async function segnaPresenzaPortiere(squadraId: string, allenamentoId: string, pid: string, valore: string): Promise<Esito> {
  if (!squadraOk(squadraId) || !allenamentoId || !/^[\w-]+$/.test(pid)) return { ok: false, errore: 'Dati non validi.' };
  const chi = await chiEntra();
  if (!chi.mister?.squadra.vedeTutte) return { ok: false, errore: 'Solo i preparatori dei portieri.' };
  const { error } = await (await createClient()).rpc('coach_presenza_portiere',
    { p_pin: chi.mister.pin, p_squadra: squadraId, p_allenamento: allenamentoId, p_giocatore: pid, p_valore: valore });
  return error ? { ok: false, errore: error.message } : { ok: true };
}

/** Partite → Tabellini, preparatore su un'altra squadra (0053): minuti e gol subiti di un SUO portiere in una partita già
 *  creata dal mister. Il database (coach_tabellino_portiere) ricontrolla categoria e ruolo. */
export async function segnaTabellinoPortiere(squadraId: string, garaId: string, pid: string, min: number | null, gc: number | null): Promise<Esito> {
  if (!squadraOk(squadraId) || !garaId || !/^[\w-]+$/.test(pid)) return { ok: false, errore: 'Dati non validi.' };
  const chi = await chiEntra();
  if (!chi.mister?.squadra.vedeTutte) return { ok: false, errore: 'Solo i preparatori dei portieri.' };
  const { error } = await (await createClient()).rpc('coach_tabellino_portiere',
    { p_pin: chi.mister.pin, p_squadra: squadraId, p_gara: garaId, p_giocatore: pid, p_min: min, p_gc: gc });
  return error ? { ok: false, errore: error.message } : { ok: true };
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

/** Società → Squadre: un cambio su shared/teams (squadre, mister, PIN), solo admin e direttori (0020; il database lo ricontrolla).
 *  PIN dei mister (0050, un PIN per persona): il PIN personale se è anche staff, se no quello che ha già in un'altra squadra, se no
 *  4 cifre casuali mai usate; va su tutte le righe della stessa persona. Restituisce le squadre salvate */
export async function cambiaSquadre(op: OpSquadre): Promise<Esito<SquadraSocieta[]>> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin' && chi.profilo?.ruolo !== 'direttore') return { ok: false, errore: 'Solo admin e direttori.' };
  // un PIN per persona (0050): PIN personale di scout, direttori e segreteria con lo stesso nome (letti con i permessi di chi chiama)
  const supabase = await createClient();
  const [{ data: persone }, { data: codici }] = op.tipo === 'pinMister'
    ? await Promise.all([supabase.from('profiles').select('id, nome, cognome, ruolo').in('ruolo', ['direttore', 'scout', 'segreteria']).eq('attivo', true),
      supabase.from('codici_accesso').select('profilo_id, pin')])
    : [{ data: [] }, { data: [] }];
  const pinDi = new Map((codici ?? []).map((c) => [c.profilo_id as string, c.pin as string]));
  const staff = new Map((persone ?? []).filter((p) => pinDi.get(p.id)).map((p) => [chiaveNome(`${p.nome ?? ''} ${p.cognome ?? ''}`), { pin: pinDi.get(p.id)!, ruolo: p.ruolo as string }]));
  const pinStaff = new Set([...staff.values()].map((x) => x.pin));
  const pinLibero = (usati: Set<string>, persona: { nome: string; attuale: string; altri: string[] }) => {
    const suo = staff.get(chiaveNome(persona.nome));
    if (suo && persona.attuale !== suo.pin) return suo.pin;   // è anche staff: il suo PIN personale
    if (persona.attuale && pinStaff.has(persona.attuale)) {
      throw new Error(`È il PIN personale (${suo?.ruolo ?? 'staff'}): si cambia dalla sua riga più in basso, e cambia anche qui.`);
    }
    if (!persona.attuale && persona.altri[0]) return persona.altri[0];   // mister anche di un'altra squadra: stesso PIN
    for (;;) { const p = String(randomInt(1000, 10000)); if (!usati.has(p)) return p; }
  };
  try {
    return await aggiorna(chi, 'shared/teams', (base) => {
      const items = ((base?.items as SquadraSocieta[] | undefined) ?? []);
      const nuove = applicaOpSquadre(items, senzaSpazi(op), pinLibero);
      return nuove ? { nuovo: { ...base, items: nuove }, valore: nuove } : { nuovo: null, valore: items };
    });
  } catch (e) {
    return { ok: false, errore: e instanceof Error ? e.message : 'Non riuscito.' };
  }
}

/** Società → Backup: tutti i documenti del Portale delle squadre in un file JSON (admin e direttori leggono tutto, 0011) */
export async function esportaBackup(): Promise<Esito<string>> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin' && chi.profilo?.ruolo !== 'direttore') return { ok: false, errore: 'Solo admin e direttori.' };
  const supabase = await createClient();
  const { data: t } = await supabase.from('docs').select('data').eq('path', 'shared/teams').maybeSingle();
  const ids = ((t?.data?.items ?? []) as { id: string }[]).map((x) => x.id);
  const paths = ['shared/teams', 'shared/schemes', ...ids.flatMap((id) => ['roster/' + id, 'sheet/' + id, 'calendar/' + id, 'registro/' + id])];
  const { data, error } = await supabase.from('docs').select('path, data').in('path', paths);
  if (error) return { ok: false, errore: error.message };
  const docs = Object.fromEntries((data ?? []).map((d) => [d.path, d.data]));
  return { ok: true, valore: JSON.stringify({ exportedAt: new Date().toISOString(), docs }, null, 2) };
}

/** Società → Squadre: le squadre di un direttore (0053, solo admin; il database lo ricontrolla con imposta_squadre_direttore).
 *  null = tutte (come prima); [] = nessuna (es. un direttore che segue solo la Segreteria) */
export async function impostaSquadreDirettore(profiloId: string, squadre: string[] | null): Promise<Esito> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return { ok: false, errore: 'Solo l’admin sceglie le squadre dei direttori.' };
  const { error } = await (await createClient()).rpc('imposta_squadre_direttore', { p_profilo: profiloId, p_squadre: squadre });
  if (error) return { ok: false, errore: error.message };
  return { ok: true };
}

/** Società → Squadre: chi tra i direttori vede la Segreteria (0055, solo admin; il database lo ricontrolla).
 *  Admin e account segreteria la vedono sempre, indipendentemente da questo. */
export async function impostaSegreteriaDirettore(profiloId: string, vede: boolean): Promise<Esito> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return { ok: false, errore: 'Solo l’admin sceglie chi vede la Segreteria.' };
  const { error } = await (await createClient()).rpc('imposta_segreteria_direttore', { p_profilo: profiloId, p_vede: vede });
  if (error) return { ok: false, errore: error.message };
  return { ok: true };
}

/** Piazzati → modelli della società in un altro ordine (↑ ↓, solo admin; il database lo ricontrolla) */
export async function ordinaModelli(ids: string[]): Promise<Esito> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return { ok: false, errore: 'Solo l’admin.' };
  return aggiorna(chi, 'shared/schemes', (base) => {
    const items = ((base?.items ?? []) as { id: string }[]).slice();
    items.sort((a, b) => (ids.indexOf(a.id) + 1 || 1e9) - (ids.indexOf(b.id) + 1 || 1e9));
    return { nuovo: { ...base, items } };
  });
}

/** Società → Backup → "Ripristina da un backup" (solo admin): confronto del file con le schede di oggi, senza scrivere nulla */
export async function confrontaBackup(fd: FormData): Promise<Esito<{ exportedAt?: string; schede: Confronto[] }>> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return { ok: false, errore: 'Solo l\'admin ripristina un backup.' };
  try {
    const file = fd.get('file');
    if (!(file instanceof Blob) || file.size > 20 * 1024 * 1024) return { ok: false, errore: 'Scegli il file di backup (.json, massimo 20 MB).' };
    const backup = leggiBackup(await file.text());
    const supabase = await createClient();
    const oggi: Record<string, unknown> = {};
    const paths = Object.keys(backup.docs);
    for (let i = 0; i < paths.length; i += 60) {
      const { data, error } = await supabase.from('docs').select('path, data').in('path', paths.slice(i, i + 60));
      if (error) return { ok: false, errore: error.message };
      for (const d of data ?? []) oggi[d.path] = d.data;
    }
    const squadre = ((oggi['shared/teams'] as { items?: { id: string; name?: string; category?: string }[] } | undefined)?.items
      ?? (backup.docs['shared/teams'] as { items?: { id: string }[] } | undefined)?.items ?? []);
    return { ok: true, valore: { exportedAt: backup.exportedAt, schede: confronta(backup, oggi, squadre) } };
  } catch (e) { return { ok: false, errore: (e as Error).message }; }
}

/** Rimette le schede scelte come nel backup (solo admin). Le versioni di prima restano nello Storico modifiche (0048) */
export async function ripristinaBackup(fd: FormData): Promise<Esito<number>> {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') return { ok: false, errore: 'Solo l\'admin ripristina un backup.' };
  try {
    const file = fd.get('file');
    if (!(file instanceof Blob)) return { ok: false, errore: 'Scegli il file di backup.' };
    const backup = leggiBackup(await file.text());
    const scelte = JSON.parse(String(fd.get('schede') ?? '[]')) as string[];
    let fatte = 0;
    for (const path of scelte.filter((p) => p in backup.docs)) {
      const r = await aggiorna(chi, path, () => ({ nuovo: backup.docs[path] as Record<string, unknown> }));
      if (!r.ok) return { ok: false, errore: `${path}: ${r.errore}` };
      fatte++;
    }
    return { ok: true, valore: fatte };
  } catch (e) { return { ok: false, errore: (e as Error).message }; }
}
