// Importazione di un calendario ufficiale (PDF già letto da lib/calendario-pdf.ts) dentro l'app: stesse regole degli script
// scripts/import-calendari/importa.mjs (gare dello Scouting e società) e portale.mjs (calendario delle nostre squadre).
// - Gare: ogni partita entra "da calendario"; reimportando si aggiornano solo quelle ancora "da calendario": le confermate o variate
//   da un comunicato (o modificate a mano) restano come sono. Società collegate a quelle in archivio (nome o nome alternativo),
//   le nuove si creano coi nomi del calendario come nomi alternativi.
// - Nostre squadre: "Under 14 - Provinciale" prende le gare "Under 14 … Provinciali …" dell'Academy. Partita già in calendario
//   (stesso avversario, casa o trasferta) → collegata (garaId), data, ora e campo SEMPRE quelli ufficiali; partita che manca → aggiunta.
// Scrive con i permessi di chi importa (admin e direttori: RLS). Le funzioni pure (unisciCalendario, righeGare) sono provate in
// tests/calendario-pdf.test.mjs.
import type { SupabaseClient } from '@supabase/supabase-js';
import { pulito, type PartitaPronta } from '@/lib/calendario-pdf';
import { NOSTRA_SOCIETA } from '@/lib/societa';

type Societa = { id: string; nome: string; alias: string[] | null; campo: string | null; indirizzo: string | null };
type Club = { nome: string; alias: Set<string>; campi: Map<string, { indirizzo: string | null; n: number }> };
export type GaraRiga = {
  chiave: string; stagione: string; categoria: string; girone: string; giornata: number; turno: string; data_ora: string; ora_da_definire: boolean;
  casa_nome: string; trasferta_nome: string; campo: string | null; indirizzo: string | null; codice_campo: string | null; fonte: string; stato: string;
  _casa: string; _trasferta: string;
};
export type GaraNostra = { id: string; data_ora: string; categoria: string; casa_id: string | null; trasferta_id: string | null; casa_nome: string;
  trasferta_nome: string; campo: string | null; indirizzo: string | null; lat: number | null; lon: number | null; ora_da_definire: boolean; stato: string; comunicato: string | null };
export type PartitaCal = { id: string; date?: string; time?: string; opponent?: string; home?: boolean; friendly?: boolean; garaId?: string;
  venue?: string; address?: string; ll?: string; stato?: string; comunicato?: string; [k: string]: unknown };

// "Casatese Merate" di Rogoredo è un'altra società rispetto alla nostra Academy (che in archivio ha "Casatese Merate" tra gli alias)
const NOMI_FISSI: Record<string, string> = { CASATESEMERATE: 'Casatese Merate (Rogoredo)' };
const paese = (campo: string) => campo.split(' - ').pop()!.replace(/\bFRAZ.*$/i, '').trim().toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, a, b) => a + b.toUpperCase());

/** "2026-10-18" + "10:30" (ora italiana) → istante ISO */
export function istante(data: string, ora: string | null) {
  const [a, m, g] = data.split('-').map(Number), [hh, mm] = (ora ?? '12:00').split(':').map(Number);
  const comeUtc = Date.UTC(a, m - 1, g, hh, mm);
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: 'numeric',
    day: 'numeric', hour: 'numeric', minute: 'numeric' }).formatToParts(new Date(comeUtc)).map((x) => [x.type, x.value]));
  return new Date(comeUtc - (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - comeUtc)).toISOString();
}

/** Società del calendario (per chiave) col nome da mostrare; due società con lo stesso nome prendono il paese del campo */
export function clubDi(partite: PartitaPronta[]) {
  const club = new Map<string, Club>();
  for (const p of partite) {
    for (const s of [p.casa, p.trasferta]) {
      if (!club.has(s.chiave)) club.set(s.chiave, { nome: s.nome, alias: new Set(), campi: new Map() });
      for (const n of [s.ufficiale, s.calendario]) if (!/sq\.?\s?[bc]\b/i.test(n)) club.get(s.chiave)!.alias.add(n);
    }
    if (p.campo) {
      const c = club.get(p.casa.chiave)!.campi, x = c.get(p.campo) ?? { indirizzo: p.indirizzo, n: 0 };
      x.n++; c.set(p.campo, x);
    }
  }
  const stessoNome: Record<string, number> = {};
  for (const c of club.values()) stessoNome[c.nome] = (stessoNome[c.nome] ?? 0) + 1;
  for (const [k, c] of club) {
    const principale = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0]?.[0];
    if (NOMI_FISSI[k]) c.nome = NOMI_FISSI[k];
    else if (stessoNome[c.nome] > 1 && principale) c.nome = `${c.nome} (${paese(principale)})`;
  }
  return club;
}

/** Le righe della tabella gare (senza gli id delle società, aggiunti al salvataggio) */
export function righeGare(partite: PartitaPronta[], club: Map<string, Club>): GaraRiga[] {
  const nome = (s: PartitaPronta['casa']) => (s.squadra ? `${club.get(s.chiave)!.nome} sq.${s.squadra}` : club.get(s.chiave)!.nome);
  const unica = new Map<string, GaraRiga>();
  for (const p of partite) {
    const chiave = [p.stagione, p.categoria, p.girone, p.casa.chiave + p.casa.squadra, p.trasferta.chiave + p.trasferta.squadra].join('|');
    unica.set(chiave, {
      chiave, stagione: p.stagione, categoria: p.categoria, girone: p.girone, giornata: p.giornata, turno: p.turno,
      data_ora: istante(p.data, p.ora), ora_da_definire: !p.ora, casa_nome: nome(p.casa), trasferta_nome: nome(p.trasferta),
      campo: p.campo, indirizzo: p.indirizzo, codice_campo: p.codice_campo, fonte: p.fonte, stato: 'calendario', _casa: p.casa.chiave, _trasferta: p.trasferta.chiave,
    });
  }
  return [...unica.values()];
}

/** Società in archivio per chiave (nome e nomi alternativi) */
export function collega(club: Map<string, Club>, esistenti: Societa[]) {
  const perChiave = new Map<string, Societa>();
  for (const s of esistenti) for (const n of [s.nome, ...(s.alias ?? [])]) { const k = pulito(n); if (k && !perChiave.has(k)) perChiave.set(k, s); }
  const collegate: [string, Club, Societa][] = [], nuove: [string, Club][] = [];
  // nome tagliato dal PDF ("ACADEMY CASATESE MERA"): inizio di una sola società in archivio
  const tagliato = (k: string) => {
    if (k.length < 10) return undefined;
    const trovate = new Set([...perChiave].filter(([x]) => x.startsWith(k)).map(([, s]) => s));
    return trovate.size === 1 ? [...trovate][0] : undefined;
  };
  for (const [k, c] of club) {
    const s = NOMI_FISSI[k] ? esistenti.find((x) => x.nome === NOMI_FISSI[k])
      : perChiave.get(k) ?? [...c.alias].map((n) => perChiave.get(pulito(n))).find(Boolean) ?? tagliato(k);
    if (s) { collegate.push([k, c, s]); c.nome = s.nome; } else nuove.push([k, c]);
  }
  return { collegate, nuove };
}

/** Calendario di una nostra squadra con le gare ufficiali: collega, aggiorna data/ora/campo, aggiunge quelle che mancano */
export function unisciCalendario(matches: PartitaCal[], gare: GaraNostra[], nostraId: string, nuovoId: () => string) {
  const norm = (s?: string) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase()
    .replace(/\b(A\.?S\.?D\.?|S\.?S\.?D\.?|G\.?S\.?O?\.?|POL\.?|C\.?S\.?C\.?|A\.?C\.?|U\.?S\.?D?\.?|CALCIO|\(.*\))/g, ' ').replace(/[^A-Z0-9]/g, '');
  const stesso = (a?: string, b?: string) => { const x = norm(a), y = norm(b); return !!x && !!y && (x === y || x.includes(y) || y.includes(x)); };
  const quando = (iso: string) => {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit',
      day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
    return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
  };
  const out = structuredClone(matches);
  let aggiunte = 0, aggiornate = 0;
  for (const g of gare) {
    const casa = g.casa_id === nostraId, avversario = casa ? g.trasferta_nome : g.casa_nome;
    const { date, time } = quando(g.data_ora), ora = g.ora_da_definire ? '' : time;
    const luogo = { venue: g.campo ?? '', address: g.indirizzo ?? '', ...(g.lat !== null && g.lon !== null ? { ll: `${g.lat},${g.lon}` } : {}) };
    const m = out.find((x) => x.garaId === g.id) ?? out.find((x) => !x.garaId && !x.friendly && !!x.home === casa && stesso(x.opponent, avversario));
    if (!m) {
      out.push({ id: nuovoId(), date, time: ora, ...luogo, opponent: avversario, home: casa, garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
      aggiunte++; continue;
    }
    const prima = JSON.stringify(m);
    Object.assign(m, { garaId: g.id, stato: g.stato, comunicato: g.comunicato ?? '' });
    if (luogo.venue) Object.assign(m, { venue: luogo.venue, address: luogo.address }, luogo.ll ? { ll: luogo.ll } : {});
    if (m.date !== date || (ora && (m.time || '').padStart(5, '0') !== ora)) Object.assign(m, { date, time: ora || m.time });
    if (JSON.stringify(m) !== prima) aggiornate++;
  }
  return { matches: out, aggiunte, aggiornate };
}

const LIVELLI: [string, string][] = [['elite', 'Élite'], ['élite', 'Élite'], ['provinciale', 'Provinciali'], ['regionale', 'Regionali']];
/** Le gare di una categoria del calendario vanno alla squadra "Under N - <livello>" (Élite prima di Regionale) */
export function categoriaDellaSquadra(categoriaSquadra: string, categoriaGare: string) {
  const eta = categoriaSquadra.match(/under\s*(\d+)/i)?.[1];
  const livello = LIVELLI.find(([k]) => categoriaSquadra.toLowerCase().includes(k))?.[1];
  return !!eta && categoriaGare.startsWith(`Under ${eta}`) && (!livello || categoriaGare.includes(livello));
}

/** Riepilogo senza scrivere (anteprima) o scrittura delle gare e delle società. Restituisce anche le nostre gare (con id e stato) */
export async function scriviGare(db: SupabaseClient, partite: PartitaPronta[], conferma: boolean) {
  const club = clubDi(partite);
  const { data: esistenti, error } = await db.from('societa').select('id, nome, alias, campo, indirizzo');
  if (error) throw new Error('Società: ' + error.message);
  const { collegate, nuove } = collega(club, esistenti as Societa[]);
  const righe = righeGare(partite, club);
  // Stessa partita già in archivio con un'altra chiave (nome della società letto un po' diverso): stessa categoria, girone, giornata,
  // andata o ritorno e stesse società → si riusa la sua chiave, così non nasce un doppione
  const idCollegata = new Map(collegate.map(([k, , s]) => [k, s.id]));
  const gia = new Map<string, string>();
  for (const [stagione, categoria] of [...new Set(righe.map((r) => r.stagione + '\u0000' + r.categoria))].map((x) => x.split('\u0000'))) {
    for (let da = 0; ; da += 1000) {
      const { data, error: e } = await db.from('gare').select('chiave, girone, giornata, turno, casa_id, trasferta_id')
        .eq('stagione', stagione).eq('categoria', categoria).not('chiave', 'is', null).range(da, da + 999);
      if (e) throw new Error('Gare: ' + e.message);
      for (const g of data ?? []) gia.set([g.girone, g.giornata, g.turno, g.casa_id, g.trasferta_id].join('|'), g.chiave);
      if ((data ?? []).length < 1000) break;
    }
  }
  for (const r of righe) {
    const casa = idCollegata.get(r._casa), fuori = idCollegata.get(r._trasferta);
    const esistente = casa && fuori ? gia.get([r.girone, r.giornata, r.turno, casa, fuori].join('|')) : undefined;
    if (esistente) r.chiave = esistente;
  }
  const stati = new Map<string, string>();
  for (let i = 0; i < righe.length; i += 40) {
    const { data, error: e } = await db.from('gare').select('chiave, stato').in('chiave', righe.slice(i, i + 40).map((r) => r.chiave));
    if (e) throw new Error('Gare: ' + e.message);
    for (const g of data ?? []) stati.set(g.chiave, g.stato);
  }
  const daScrivere = righe.filter((r) => (stati.get(r.chiave) ?? 'calendario') === 'calendario');
  const riepilogo = { gare: righe.length, gia: stati.size, nuoveGare: righe.length - stati.size, bloccate: righe.length - daScrivere.length, collegate: collegate.length, nuove: nuove.map(([, c]) => c.nome) };
  const nostra = (esistenti as Societa[]).find((s) => s.nome === NOSTRA_SOCIETA)?.id ?? null;
  const nostraChiave = collegate.find(([, , s]) => s.id === nostra)?.[0];
  const nostre = righe.filter((r) => nostraChiave && (r._casa === nostraChiave || r._trasferta === nostraChiave));
  if (!conferma) return { riepilogo, nostra, nostraChiave, nostre, scritte: 0 };

  const idDi = new Map<string, string>();
  for (const [k, c, s] of collegate) {
    idDi.set(k, s.id);
    const alias = [...new Set([...(s.alias ?? []), ...c.alias])].filter((a) => a !== s.nome);
    const [campo, info] = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0] ?? [];
    const agg: Record<string, unknown> = { alias };
    if (!s.campo && campo) Object.assign(agg, { campo, indirizzo: info.indirizzo });
    if (alias.length !== (s.alias ?? []).length || agg.campo) await db.from('societa').update(agg).eq('id', s.id);
  }
  for (let i = 0; i < nuove.length; i += 200) {
    const blocco = nuove.slice(i, i + 200).map(([, c]) => {
      const [campo, info] = [...c.campi].sort((a, b) => b[1].n - a[1].n)[0] ?? [];
      return { nome: c.nome, alias: [...c.alias].filter((a) => a !== c.nome), campo: campo ?? null, indirizzo: info?.indirizzo ?? null };
    });
    const { data, error: e } = await db.from('societa').insert(blocco).select('id, nome');
    if (e) throw new Error('Nuove società: ' + e.message);
    (data ?? []).forEach((s, j) => idDi.set(nuove[i + j][0], s.id));
  }
  const finali = daScrivere.map(({ _casa, _trasferta, ...r }) => ({ ...r, casa_id: idDi.get(_casa) ?? null, trasferta_id: idDi.get(_trasferta) ?? null }));
  for (let i = 0; i < finali.length; i += 500) {
    const { error: e } = await db.from('gare').upsert(finali.slice(i, i + 500), { onConflict: 'chiave' });
    if (e) throw new Error('Gare: ' + e.message);
  }
  return { riepilogo, nostra, nostraChiave, nostre, scritte: finali.length };
}
