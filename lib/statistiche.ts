// Dashboard delle statistiche della squadra (Squadra → Dashboard, spunto: la dashboard di YouCoach). Funzioni pure, provate in
// tests/statistiche.test.mjs. Ogni indicatore ha una sigla e una spiegazione breve, mostrata sotto il numero.
import type { Partita } from '@/lib/programma';
import { MOTIVI, haGiocato, infoGara, presenzaDi, risultato, garaGiocata, type Registro } from '@/lib/registro';

type Cal = Partita & { id: string; friendly?: boolean };
const num = (v: unknown) => +(v as number) || 0;

/** Sigle della dashboard: nome per esteso e spiegazione minima. `attivo: false` = servono dati che oggi non registriamo */
export const SIGLE = {
  TAR: { nome: 'Presenza agli allenamenti', spiegazione: 'Presenze sul totale degli allenamenti segnati, escluse le assenze per infortunio.' },
  TMR: { nome: 'Allenamenti per partita', spiegazione: 'Quanti allenamenti per ogni partita giocata nel periodo.' },
  SMM: { nome: 'Minuti giocati insieme', spiegazione: 'Per ogni coppia di ragazzi, i minuti in campo insieme (stima: il minore dei due minutaggi in ogni partita).' },
  PPC: { nome: 'Partite giocate insieme', spiegazione: 'Per ogni coppia di ragazzi, la % di partite in cui hanno giocato tutti e due.' },
  RR: { nome: 'Permanenza', spiegazione: '% di ragazzi della rosa di inizio stagione ancora in squadra.', attivo: false },
  DOR: { nome: 'Abbandoni', spiegazione: '% di ragazzi usciti dalla rosa durante la stagione.', attivo: false },
  YIA: { nome: 'Anni in Academy', spiegazione: 'Da quanti anni, in media, i ragazzi giocano con noi.', attivo: false },
} as const;
export type Sigla = keyof typeof SIGLE;

export type Coppia = { min: number; insieme: number };

/** Tutti i numeri della dashboard nel periodo ('all' = stagione, se no "2026-09") */
export function dashboard(reg: Registro, giocatori: { id: string; name: string }[], calendario: Cal[], periodo: string) {
  const nel = (d?: string) => periodo === 'all' || (d || '').startsWith(periodo);
  const tr = (reg.trainings ?? []).filter((t) => nel(t.date)).sort((a, b) => a.date.localeCompare(b.date));
  const gm = (reg.games ?? []).filter((g) => garaGiocata(g) && nel(infoGara(g, calendario).date))
    .sort((a, b) => infoGara(a, calendario).date.localeCompare(infoGara(b, calendario).date));

  /* allenamenti: presenze, assenze per motivo, andamento seduta per seduta */
  let P = 0, fuori = 0;
  const motivi: Record<string, number> = Object.fromEntries([...MOTIVI.map((m) => m.k), 'A'].map((k) => [k, 0]));
  const andamento = tr.map((t) => {
    let p = 0, tot = 0;
    for (const g of giocatori) {
      const v = presenzaDi(t, g.id);
      if (!v) continue;
      if (v in motivi) motivi[v]++;
      if (v === 'INF') continue;
      tot++;
      if (v === 'P') p++;
    }
    P += p; fuori += tot - p;
    return { data: t.date, presenti: p, pct: tot ? p / tot : null };
  });
  const assenze = [...MOTIVI.map((m) => ({ k: m.k, l: m.l, n: motivi[m.k] })), { k: 'A', l: 'Senza motivo', n: motivi.A }];

  /* partite: minuti per giocatore e coppie (minuti e partite insieme) */
  const conMinuti = gm.some((g) => Object.values(g.pl ?? {}).some((x) => num(x.min) > 0));
  const minuti = giocatori.map((p) => {
    let min = 0, partite = 0;
    for (const g of gm) { const x = (g.pl ?? {})[p.id] ?? {}; if (haGiocato(x)) { partite++; min += num(x.min); } }
    return { p, min, partite };
  });
  const coppie: Record<string, Record<string, Coppia>> = {};
  for (const g of gm) {
    const pl = g.pl ?? {};
    const inCampo = giocatori.filter((p) => pl[p.id] && haGiocato(pl[p.id]));
    for (const a of inCampo) for (const b of inCampo) {
      if (a.id === b.id) continue;
      const c = ((coppie[a.id] ??= {})[b.id] ??= { min: 0, insieme: 0 });
      c.insieme++;
      c.min += Math.min(num(pl[a.id].min), num(pl[b.id].min));
    }
  }
  const noti = gm.map((g) => risultato(g, reg.gk ?? [])).filter(Boolean) as { gf: number; ga: number }[];

  return {
    allenamenti: tr.length, partite: gm.length,
    tar: P + fuori ? P / (P + fuori) : null,
    tmr: gm.length ? tr.length / gm.length : null,
    andamento, assenze, minuti, coppie, conMinuti,
    risultati: { noti: noti.length, v: noti.filter((s) => s.gf > s.ga).length, n: noti.filter((s) => s.gf === s.ga).length, p: noti.filter((s) => s.gf < s.ga).length },
  };
}
