// Statistiche della squadra (0017): KPI per il vivaio e performance della stagione
import { type Partita } from '@/lib/programma';
import { type Registro, garaGiocata, haGiocato, presenzaDi, type Allenamento } from '@/lib/registro';

const num = (v: unknown) => +(v as number) || 0;

/** TAR (Training Attendance Rate): % presenze allenamenti rispetto a presenze + assenze (escluso malattia/infortunio) */
export function tar(trainings: Allenamento[], giocatori: { id: string }[]): number | null {
  let presenti = 0, assenti = 0;
  trainings.forEach((t) => {
    giocatori.forEach((p) => {
      const v = presenzaDi(t, p.id);
      if (v === 'P') presenti++;
      else if (v && !['MAL', 'INF'].includes(v)) assenti++;   // assenti per scuola/famiglia/ingiustificata
    });
  });
  return presenti + assenti > 0 ? Math.round((presenti / (presenti + assenti)) * 100) : null;
}

/** TMR (Training-to-Match Ratio): quanti allenamenti per ogni partita giocata */
export function tmr(trainings: Allenamento[], games: Registro['games'] = []): number | null {
  const giocate = (games ?? []).filter(garaGiocata).length;
  return giocate > 0 ? Math.round(((trainings?.length ?? 0) / giocate) * 10) / 10 : null;
}

/** SMM (Shared Match Minutes): minuti contemporanei tra coppie di giocatori nella stagione */
export function smm(games: Registro['games'] = [], giocatori: { id: string }[]): Record<string, number> {
  const out: Record<string, number> = {};
  (games ?? []).filter(garaGiocata).forEach((g) => {
    const pl = g.pl ?? {};
    const inCampo = giocatori.filter((p) => {
      const x = pl[p.id] ?? {};
      return haGiocato(x) && num(x.min) > 0;   // solo chi ha giocato minuti > 0
    });
    for (let i = 0; i < inCampo.length; i++) {
      for (let j = i + 1; j < inCampo.length; j++) {
        const id1 = inCampo[i].id, id2 = inCampo[j].id;
        const min1 = num(pl[id1]?.min), min2 = num(pl[id2]?.min);
        const insieme = Math.min(min1, min2);
        const key = [id1, id2].sort().join('|');
        out[key] = (out[key] ?? 0) + insieme;
      }
    }
  });
  return out;
}

/** PPC (Pitch Pairing Correlation): % di partite giocate insieme tra coppie di giocatori */
export function ppc(games: Registro['games'] = [], giocatori: { id: string }[]): Record<string, number> {
  const giocate = (games ?? []).filter(garaGiocata).length;
  if (!giocate) return {};
  const insieme: Record<string, number> = {};
  (games ?? []).forEach((g) => {
    const pl = g.pl ?? {};
    giocatori.forEach((a) => {
      giocatori.forEach((b) => {
        if (a.id >= b.id) return;   // no doppioni, no auto-pairing
        const minA = num(pl[a.id]?.min), minB = num(pl[b.id]?.min);
        if (minA > 0 && minB > 0) {
          const key = [a.id, b.id].sort().join('|');
          insieme[key] = (insieme[key] ?? 0) + 1;
        }
      });
    });
  });
  const out: Record<string, number> = {};
  Object.entries(insieme).forEach(([k, v]) => { out[k] = Math.round((v / giocate) * 100); });
  return out;
}

/** Presenze di un giocatore negli allenamenti (P, escluso malattia/infortunio) */
export function presenzeGiocatore(trainings: Allenamento[], giocatore_id: string): { P: number; A: number } {
  let P = 0, A = 0;
  trainings.forEach((t) => {
    const v = presenzaDi(t, giocatore_id);
    if (v === 'P') P++;
    else if (v && !['MAL', 'INF'].includes(v)) A++;
  });
  return { P, A };
}

/** Minuti totali e media per giocatore in una stagione */
export function minutiGiocatore(games: Registro['games'] = [], giocatore_id: string): { tot: number; media: number; partite: number } {
  const giocate = (games ?? []).filter(garaGiocata);
  let tot = 0, con_minuti = 0;
  giocate.forEach((g) => {
    const min = num((g.pl ?? {})[giocatore_id]?.min);
    if (min > 0) { tot += min; con_minuti++; }
  });
  return { tot, media: con_minuti > 0 ? Math.round(tot / con_minuti) : 0, partite: con_minuti };
}

/** Riepilogo veloce: presenze, minuti, gol per la Home squadra */
export type RiepilogoVeloce = {
  tar: number | null;
  tmr: number | null;
  allenamenti: number;
  partite: number;
  pct_presenti_per_partita: number | null;
  gol_fatti: number;
  gol_subiti: number;
};

export function riepilogoVeloce(reg: Registro): RiepilogoVeloce {
  const trainings = reg.trainings ?? [];
  const games = (reg.games ?? []).filter(garaGiocata);
  const portieri = reg.gk ?? [];

  let gf = 0, ga = 0;
  games.forEach((g) => {
    const pl = g.pl ?? {};
    Object.entries(pl).forEach(([pid, x]) => {
      gf += num(x.g);
      if (x.gk || portieri.includes(pid)) ga += num(x.gc);
    });
  });
  gf += num((games[games.length - 1]?.og ?? 0));   // autogoli ultimi

  const presenti_tot = games.reduce((a, g) => a + Object.values(g.pl ?? {}).filter(haGiocato).length, 0);

  return {
    tar: tar(trainings, []),   // per una buona stima servirebbe giocatori
    tmr: tmr(trainings, games),
    allenamenti: trainings.length,
    partite: games.length,
    pct_presenti_per_partita: games.length > 0 ? Math.round((presenti_tot / games.length) * 10) / 10 : null,
    gol_fatti: gf,
    gol_subiti: ga,
  };
}
