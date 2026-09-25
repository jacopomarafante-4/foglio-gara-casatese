export type Ruolo = 'admin' | 'direttore' | 'scout' | 'mister';

export type Profilo = {
  id: string;
  email: string;
  nome: string | null;
  cognome: string | null;
  ruolo: Ruolo;
  annate: number[];
  attivo: boolean;
};

export const ETICHETTA_RUOLO: Record<Ruolo, string> = {
  admin: 'Admin',
  direttore: 'Direttore',
  scout: 'Scout',
  mister: 'Mister',
};

/** Ruoli che possono accedere al pannello Scouting Hub (i mister no, per ora) */
export function puoAccedere(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'scout';
}

/** Pannello che si apre dopo l'accesso: admin e direttori il Portale (lì c'è tutto, Scouting compreso),
 *  gli scout lo Scouting */
export function pannelloIniziale(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' ? '/portale/' : '/home';
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
