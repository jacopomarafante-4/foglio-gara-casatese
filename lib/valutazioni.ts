// Chi ha fatto una valutazione e quante persone diverse l'hanno valutato (regola delle 3 valutazioni, migrazione 0040:
// il database conta allo stesso modo in valutatori_distinti). Funzioni pure, provate in tests/.
export type FirmaValutazione = { chiave: string; nome: string; mister: boolean };

/** Chi firma: account dello staff (nome e cognome) o mister dal Portale ("Mister Rossi · Under 14") */
export function firma(v: {
  autore_id?: string | null; autore_squadra?: string | null;
  autore?: { nome: string | null; cognome: string | null; email?: string } | null;
}): FirmaValutazione {
  if (v.autore) {
    const nome = [v.autore.nome, v.autore.cognome].filter(Boolean).join(' ') || v.autore.email || 'Staff';
    return { chiave: v.autore_id ?? nome, nome, mister: false };
  }
  // account che non si legge più (es. rimosso): conta comunque come quella persona, come nel database
  if (v.autore_id) return { chiave: v.autore_id, nome: 'Autore non disponibile', mister: false };
  if (v.autore_squadra) return { chiave: 'm:' + v.autore_squadra, nome: `Mister ${v.autore_squadra}`, mister: true };
  return { chiave: '?', nome: 'Autore non disponibile', mister: false };
}

/** Persone diverse che hanno valutato, dalla più recente (per le 3 caselle) */
export const SOGLIA_VALUTAZIONI = 3;
export function valutatori<T extends { data: string } & Parameters<typeof firma>[0]>(valutazioni: T[]): FirmaValutazione[] {
  const ordinate = [...valutazioni].sort((a, b) => b.data.localeCompare(a.data)).map(firma);
  return ordinate.filter((f, i) => f.chiave === '?' || ordinate.findIndex((x) => x.chiave === f.chiave) === i);
}

/* ---------- Voti per area (Tecnica, Motoria, Tattica, Mentale) ----------
   Dalla 0043 le 4 aree si danno nella segnalazione (facoltative); le valutazioni già fatte le hanno ancora.
   Le medie usano tutte e due, e ogni area conta solo dove c'è un voto. */
export const CHIAVI_AREE = ['tecnica', 'motoria', 'tattica', 'mentale'] as const;
export type ChiaveAreaVoto = (typeof CHIAVI_AREE)[number];
export type VotiAree = { data: string } & Partial<Record<ChiaveAreaVoto, number | null>>;

/** Media dei voti presenti in una segnalazione o valutazione (null se non ne ha) */
export function mediaVoti(r: Partial<Record<ChiaveAreaVoto, number | null>>): number | null {
  const v = CHIAVI_AREE.map((k) => r[k]).filter((x): x is number => typeof x === 'number');
  return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null;
}
/** Solo i record (segnalazioni e valutazioni) con almeno un voto per area, dal più recente */
export function conVoti<T extends VotiAree>(records: T[]): T[] {
  return records.filter((r) => mediaVoti(r) !== null).sort((a, b) => b.data.localeCompare(a.data));
}
/** Media per area su più record, e media generale (null dove non ci sono voti) */
export function medieAree(records: VotiAree[]) {
  const per = Object.fromEntries(CHIAVI_AREE.map((k) => {
    const v = records.map((r) => r[k]).filter((x): x is number => typeof x === 'number');
    return [k, v.length ? v.reduce((s, x) => s + x, 0) / v.length : null];
  })) as Record<ChiaveAreaVoto, number | null>;
  const valide = Object.values(per).filter((x): x is number => x !== null);
  return { per, media: valide.length ? valide.reduce((s, x) => s + x, 0) / valide.length : null, quanti: conVoti(records).length };
}
