// Home (/inizio): calcoli per i riquadri del mister e della società. Funzioni pure, provate in tests/home.test.mjs.
import type { Partita } from '@/lib/programma';
import { dataGara, garaGiocata, presenzaDi, riepilogo, risultato, type Gara, type Registro } from '@/lib/registro';

/** Presenza media agli allenamenti mese per mese (esclusi gli infortuni), dal più vecchio: [{ mese: '2026-09', pct: 0.98 }] */
export function presenzePerMeseSquadra(reg: Registro, giocatori: { id: string }[]) {
  const per: Record<string, { P: number; tot: number }> = {};
  for (const t of reg.trainings ?? []) {
    const m = (t.date || '').slice(0, 7);
    if (!m) continue;
    for (const p of giocatori) {
      const v = presenzaDi(t, p.id);
      if (!v || v === 'INF') continue;
      const x = (per[m] ??= { P: 0, tot: 0 });
      x.tot++; if (v === 'P') x.P++;
    }
  }
  return Object.keys(per).sort().filter((m) => per[m].tot).map((mese) => ({ mese, pct: per[mese].P / per[mese].tot }));
}

export type Risultato = { id: string; data: string; avversario: string; casa: boolean; gf: number; ga: number; marcatori: { id: string; gol: number }[] };
/** Partite giocate con il risultato noto, dalla più recente */
export function risultati(reg: Registro, calendario: Partita[]): Risultato[] {
  return (reg.games ?? []).filter(garaGiocata).flatMap((g: Gara) => {
    const r = risultato(g, reg.gk ?? []);
    if (!r) return [];
    const marcatori = Object.entries(g.pl ?? {}).map(([id, x]) => ({ id, gol: +(x.g as number) || 0 })).filter((x) => x.gol > 0).sort((a, b) => b.gol - a.gol);
    return [{ id: g.id, data: dataGara(g, calendario), avversario: g.opponent || '', casa: !!g.home, ...r, marcatori }];
  }).sort((a, b) => b.data.localeCompare(a.data));
}

/** Risposte delle famiglie per una partita (chiave come in Convocazioni: id del calendario, o "data|avversario") */
export function contaRisposte(risposte: Record<string, { risposta: 'si' | 'no' }>, giocatori: { id: string }[], partita: { id?: string; date?: string; opponent?: string }) {
  const chiave = partita.id || `${partita.date}|${partita.opponent}`;
  let si = 0, no = 0;
  for (const p of giocatori) { const r = risposte[`${p.id}|${chiave}`]?.risposta; if (r === 'si') si++; else if (r === 'no') no++; }
  return { si, no };
}

/** Giorni da oggi a una data (0 = oggi) e la frase: "oggi", "domani", "tra 4 giorni" */
export function traQuanto(oggi: string, data?: string) {
  if (!data) return '';
  const n = Math.round((Date.parse(data + 'T12:00:00Z') - Date.parse(oggi + 'T12:00:00Z')) / 86400000);
  return n <= 0 ? 'oggi' : n === 1 ? 'domani' : `tra ${n} giorni`;
}

/** Saluto secondo l'ora italiana */
export const saluto = (ora: number) => (ora < 13 ? 'Buongiorno' : ora < 18 ? 'Buon pomeriggio' : 'Buonasera');

/** Una riga della tabella della società: stagione di una squadra */
export function stagioneSquadra(reg: Registro, giocatori: { id: string }[], calendario: Partita[]) {
  const r = riepilogo(reg, giocatori, calendario);
  return { giocate: r.nG, v: r.v, n: r.n, p: r.p, gf: r.gf, gs: r.gs, conRisultato: r.nNoti, presenze: r.mediaPresenze, sottoSoglia: r.sottoSoglia, allenamenti: r.nT };
}
