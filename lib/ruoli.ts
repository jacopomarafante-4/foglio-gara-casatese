export type Ruolo = 'admin' | 'direttore' | 'scout' | 'mister' | 'segreteria';

export type Profilo = {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  ruolo: Ruolo;
  annate: number[];
  attivo: boolean;
  /** Direttore: solo queste squadre (id di shared/teams); null = tutte (come prima), [] = nessuna (es. solo Segreteria).
   *  Non c'entra con Società, Scouting e Segreteria (0053). */
  squadre: string[] | null;
  /** Direttore: vede la Segreteria (0055, scelto dall'admin; default false). Admin e account segreteria vedono sempre. */
  vedeSegreteria: boolean;
};

export const ETICHETTA_RUOLO: Record<Ruolo, string> = {
  admin: 'Admin',
  direttore: 'Direttore',
  scout: 'Scout',
  mister: 'Mister',
  segreteria: 'Segreteria',
};

/** Ruoli che possono accedere al pannello Scouting Hub (i mister no, per ora) */
export function puoAccedere(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'scout';
}

/** Pannello che si apre dopo l'accesso: admin e direttori il Portale (lì c'è tutto, Scouting compreso),
 *  la segreteria la sua area, gli scout lo Scouting */
export function pannelloIniziale(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' ? '/inizio' : ruolo === 'segreteria' ? '/segreteria' : '/home';
}

/** Stessa regola della funzione SQL public.vede_tutto(): vede tutto, contatti compresi */
export function vedeTutto(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore';
}

export function nomeCompleto(p: Pick<Profilo, 'nome' | 'cognome' | 'email'>) {
  const n = [p.nome, p.cognome].filter(Boolean).join(' ');
  return n || p.email;
}

/** Stessa regola della funzione SQL public.puo_segnalare() (0018): admin, direttori e scout */
export function puoSegnalare(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'scout';
}

/** Stati dei giocatori, gare, squadre seguite, doppioni, dati di tutti nello Scouting: admin e direttori
 *  (SQL: public.vede_tutto(), 0018). Nel Portale squadre i direttori restano in sola lettura. */
export function gestisce(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore';
}

/** Stessa regola della funzione SQL public.gestisce_segreteria() (0031, 0055): tesserati, famiglie, quote.
 *  Un direttore solo se l'admin gli ha dato `vedeSegreteria`. */
export function gestisceSegreteria(p: Pick<Profilo, 'ruolo' | 'vedeSegreteria'> | null | undefined) {
  return p?.ruolo === 'admin' || p?.ruolo === 'segreteria' || (p?.ruolo === 'direttore' && p.vedeSegreteria);
}

/** Squadre che un direttore con squadre limitate (0053) vede nelle pagine della Squadra, Home e Modulistica (null = tutte,
 *  come ogni altro ruolo). Società, Scouting, Segreteria e Calendario "Tutte le squadre" restano completi per tutti i direttori. */
export function filtraSquadreDirettore<T extends { id: string }>(p: Pick<Profilo, 'ruolo' | 'squadre'> | null | undefined, lista: T[]): T[] {
  if (p?.ruolo !== 'direttore' || p.squadre === null) return lista;
  const assegnate = p.squadre;
  return lista.filter((t) => assegnate.includes(t.id));
}
