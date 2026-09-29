// Programma gare (Modulistica, tappa 3): partite di tutte le squadre ed eventi della società in un periodo.
// Stesse regole di viewProgramma/pdfProgramma in public/portale/js/modulistica.js e di eventoCome in organizzazione.js.
import { calendarioDi, etaCategoria } from '@/lib/condivisi';

export type Partita = {
  id?: string; date?: string; time?: string; fine?: string; opponent?: string; home?: boolean; venue?: string;
  friendly?: boolean; tipo?: string; note?: string;
};
export type SquadraCal = { id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean; matches: Partita[] };
export type Evento = {
  id: string; titolo?: string; tipo?: string; data?: string; inizio?: string; fine?: string;
  luogo?: 'merate' | 'cernusco' | 'altro'; indirizzo?: string; squadre?: string[]; note?: string;
};
export type Impegno = Partita & { team?: SquadraCal; evento?: Evento; luogo?: string };

const LUOGHI_EVENTO: Record<string, string> = { merate: 'Campo di Merate', cernusco: 'Campo di Cernusco', altro: 'Altrove' };
const GIORNI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

export const giorno = (d?: string) => (d ? GIORNI[new Date(d + 'T12:00:00').getDay()] : '');
export const fmtData = (d?: string) => { if (!d) return ''; const [y, m, g] = d.split('-'); return g ? `${g}/${m}/${y}` : d; };
export const etaSquadra = (t?: { category?: string | null; name?: string | null } | null) => etaCategoria(t) ?? 99;
export const siglaSquadra = (t?: SquadraCal | null) => { const e = etaSquadra(t); return e < 99 ? 'U' + e : (t?.name || ''); };

/** Un evento della società come riga di calendario (colonna del luogo, etichetta del tipo) */
export const eventoCome = (e: Evento): Impegno => ({
  id: 'ev_' + e.id, evento: e, date: e.data, time: e.inizio || '', fine: e.fine || '', opponent: e.titolo || 'Evento',
  home: e.luogo !== 'altro', luogo: e.luogo, venue: e.luogo === 'altro' ? e.indirizzo || '' : LUOGHI_EVENTO[e.luogo ?? ''],
  tipo: e.tipo || 'Evento', note: e.note || '',
});

const quando = (m: Impegno) => (m.date || '') + (m.time || '').padStart(5, '0');

/** Impegni del periodo (dal–al compresi), delle squadre scelte (nessuna = tutte): gli eventi senza squadre valgono per tutti */
export function impegniDelPeriodo(squadre: SquadraCal[], eventi: Evento[], dal: string, al: string, scelte: string[]) {
  const tutti: Impegno[] = [...squadre.flatMap((t) => t.matches.map((m) => ({ ...m, team: t }))), ...eventi.map(eventoCome)];
  return tutti.filter((m) => m.date && m.date >= dal && m.date <= al)
    .filter((m) => !scelte.length || (m.evento ? !(m.evento.squadre ?? []).length || m.evento.squadre!.some((id) => scelte.includes(id)) : scelte.includes(m.team?.id ?? '')))
    .sort((a, b) => quando(a).localeCompare(quando(b)));
}

/** Ordine del programma stampato: per categoria (dalla più grande alla più piccola, poi gli eventi della società) e,
 *  nella stessa categoria, per giorno e ora */
export const categoriaProgramma = (m: Impegno) => (m.evento ? 'Eventi della società' : m.team?.category || m.team?.name || '');
export const ordineProgramma = (a: Impegno, b: Impegno) => (a.evento ? 1 : 0) - (b.evento ? 1 : 0) || etaSquadra(b.team) - etaSquadra(a.team)
  || categoriaProgramma(a).localeCompare(categoriaProgramma(b)) || (a.date || '').localeCompare(b.date || '') || (a.time || '99').localeCompare(b.time || '99');

export const calendario = (m: Impegno) => calendarioDi({ home: m.home, venue: m.venue, evento: m.evento, luogo: m.luogo });

/** Periodo proposto: da lunedì alla domenica della settimana di `oggi` (come nel Portale: sabato − 5 giorni → domenica) */
export function settimanaDi(oggi: string) {
  const d = new Date(oggi + 'T12:00:00'), sab = new Date(d);
  sab.setDate(d.getDate() + 5 - ((d.getDay() + 6) % 7));
  const lun = new Date(sab); lun.setDate(sab.getDate() - 5);
  const dom = new Date(sab); dom.setDate(sab.getDate() + 1);
  const iso = (x: Date) => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  return { dal: iso(lun), al: iso(dom) };
}
