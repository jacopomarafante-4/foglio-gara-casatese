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
