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
  direttore: 'Dirigente',
  scout: 'Scout',
  mister: 'Mister',
};

/** Ruoli che possono accedere al pannello Scouting Hub (i mister no, per ora) */
export function puoAccedere(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'scout';
}

/** Pannello che si apre dopo l'accesso: l'admin gestisce le squadre, i dirigenti scelgono
 *  tra Portale e Scouting (pagina d'ingresso), gli scout vanno allo Scouting */
export function pannelloIniziale(ruolo: Ruolo) {
  if (ruolo === 'admin') return '/portale/';
  if (ruolo === 'direttore') return '/';
  return '/home';
}

/** Stessa regola della funzione SQL public.vede_tutto(): vede tutto, contatti compresi (i dirigenti solo in lettura) */
export function vedeTutto(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore';
}

export function nomeCompleto(p: Pick<Profilo, 'nome' | 'cognome' | 'email'>) {
  const n = [p.nome, p.cognome].filter(Boolean).join(' ');
  return n || p.email;
}

/** Stessa regola della funzione SQL public.puo_segnalare() (0009): i dirigenti guardano soltanto */
export function puoSegnalare(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'scout';
}

/** Stati dei giocatori, gare, squadre seguite, dati di tutti: solo l'admin (SQL: public.is_admin()) */
export function gestisce(ruolo: Ruolo) {
  return ruolo === 'admin';
}
