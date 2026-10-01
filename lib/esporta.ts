// Esportazioni in Excel (pulsante "Scarica Excel", components/ScaricaExcel.tsx): i fogli di ogni pagina, costruiti dagli stessi
// dati che la pagina mostra (quindi con i permessi di chi scarica). Funzioni pure, provate in tests/esporta.test.mjs.
import type { Foglio } from '@/lib/xlsx-scrivi';
import { MOTIVI, infoGara, presenzaDi, risultato, statisticheAllenamento, statistichePartite, inPortaGara, type Registro } from '@/lib/registro';
import type { Partita } from '@/lib/programma';

type Giocatore = { id: string; name: string };
type CalId = Partita & { id: string; friendly?: boolean };
const pct = (v: number | null) => (v == null ? '' : Math.round(v * 100));
const data = (iso?: string) => { if (!iso) return ''; const [a, m, g] = iso.split('-'); return g ? `${g}/${m}/${a}` : iso; };
const ordina = (g: Giocatore[]) => g.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'));
/** Nome del file: "Rosa_Under_15_2026-10-01.xlsx" */
export const nomeFile = (cosa: string, squadra: string, oggi: string) =>
  `${[cosa, squadra].filter(Boolean).join(' ')} ${oggi}`.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w-]+/g, '_').replace(/_+/g, '_') + '.xlsx';

export function fogliRosa(giocatori: (Giocatore & { ruolo?: string; numero?: number | string | null })[]): Foglio[] {
  const tutti = giocatori as (Giocatore & { ruolo?: string; numero?: number | string | null })[];
  return [{ nome: 'Rosa', righe: [['Giocatore', 'Ruolo', 'N. partita'], ...ordina(tutti).map((p) => {
    const q = tutti.find((x) => x.id === p.id)!, n = q.numero === '' || q.numero == null ? '' : Number(q.numero);
    return [q.name, q.ruolo ?? '', Number.isFinite(n) ? n : String(q.numero)];
  })] }];
}

/** Allenamenti: riepilogo per giocatore e tabella giorno per giorno (P = presente, sigla del motivo se assente) */
export function fogliAllenamento(reg: Registro, giocatori: Giocatore[], periodo: string): Foglio[] {
  const s = statisticheAllenamento(reg, ordina(giocatori), periodo);
  const sigla = (v: string) => (v === 'P' ? 'P' : v === 'A' ? 'A' : MOTIVI.find((m) => m.k === v)?.k ?? v);
  return [
    { nome: 'Riepilogo presenze', righe: [['Giocatore', 'Presenze', ...MOTIVI.map((m) => m.l), 'Assenze senza motivo', 'Assenze totali', 'Presenza %'],
      ...s.righe.map((r) => [r.p.name, r.c.P, ...MOTIVI.map((m) => r.c[m.k]), r.c.A, r.assenze, pct(r.pct)])] },
    { nome: 'Presenze giorno per giorno', righe: [['Giocatore', ...s.tr.map((t) => data(t.date))],
      ...s.righe.map((r) => [r.p.name, ...s.tr.map((t) => sigla(presenzaDi(t, r.p.id)))])] },
    { nome: 'Legenda', righe: [['Sigla', 'Significato'], ['P', 'Presente'], ['A', 'Assente senza motivo indicato'], ...MOTIVI.map((m) => [m.k, m.l])] },
  ];
}

/** Partite: elenco delle giocate col risultato, statistiche per giocatore e minuti partita per partita */
export function fogliPartite(reg: Registro, giocatori: Giocatore[], calendario: CalId[], periodo: string): Foglio[] {
  const g = ordina(giocatori), s = statistichePartite(reg, g, calendario, periodo), portieri = reg.gk ?? [];
  const info = (x: (typeof s.gm)[number]) => infoGara(x, calendario);
  return [
    { nome: 'Partite', righe: [['Data', 'Avversario', 'Casa/Trasferta', 'Tipo', 'Gol fatti', 'Gol subiti', 'Esito'],
      ...s.gm.map((x) => {
        const i = info(x), r = risultato(x, portieri);
        return [data(i.date), i.opponent, i.home ? 'Casa' : 'Trasferta', i.comp, r?.gf ?? '', r?.ga ?? '', r ? (r.gf > r.ga ? 'V' : r.gf === r.ga ? 'N' : 'P') : ''];
      })] },
    { nome: 'Giocatori', righe: [['Giocatore', 'Presenze', 'Minuti', 'Minuti % sui disponibili', 'Media minuti', 'Gol', 'Partite in porta', 'Gol subiti'],
      ...s.righe.map((r) => [r.p.name, r.pres, r.min, pct(r.pctMin), r.media == null ? '' : Math.round(r.media), r.gol, r.inPorta || '', r.inPorta ? r.gc : ''])] },
    { nome: 'Minuti per partita', righe: [['Giocatore', ...s.gm.map((x) => `${data(info(x).date)} ${info(x).opponent}`.trim())],
      ...g.map((p) => [p.name, ...s.gm.map((x) => {
        const v = (x.pl ?? {})[p.id]; if (!v) return '';
        const m = +(v.min as number) || 0, gol = +(v.g as number) || 0;
        return m || gol || inPortaGara(x, p.id, portieri) ? `${m || (v.pres ? 'pres.' : '')}${gol ? ` (${gol} gol)` : ''}` : v.pres ? 'pres.' : '';
      })])] },
  ];
}

/** Calendario della squadra: campionato, amichevoli e tornei, in ordine di data */
export function fogliCalendario(partite: (CalId & { tipo?: string; stato?: string; address?: string })[]): Foglio[] {
  const elenco = partite.filter((m) => m.date).slice().sort((a, b) => (a.date! + (a.time ?? '')).localeCompare(b.date! + (b.time ?? '')));
  const stato = (s?: string) => (s === 'confermata' ? 'Confermata' : s === 'variata' ? 'Variata' : s === 'calendario' ? 'Da calendario' : '');
  return [{ nome: 'Calendario', righe: [['Data', 'Ora', 'Avversario', 'Casa/Trasferta', 'Tipo', 'Campo', 'Indirizzo', 'Stato'],
    ...elenco.map((m) => [data(m.date), m.time ?? '', m.opponent ?? '', m.home ? 'Casa' : 'Trasferta',
      m.friendly ? (m.tipo || 'Amichevole') : 'Campionato', m.venue ?? '', m.address ?? '', stato(m.stato)])] }];
}
