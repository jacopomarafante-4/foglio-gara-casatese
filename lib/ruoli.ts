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
  direttore: 'Direttore scouting',
  scout: 'Scout',
  mister: 'Mister',
};

/** Ruoli che possono accedere al pannello Scouting Hub (i mister no, per ora) */
export function puoAccedere(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore' || ruolo === 'scout';
}

/** Stessa regola della funzione SQL public.vede_tutto() */
export function vedeTutto(ruolo: Ruolo) {
  return ruolo === 'admin' || ruolo === 'direttore';
}

export function nomeCompleto(p: Pick<Profilo, 'nome' | 'cognome' | 'email'>) {
  const n = [p.nome, p.cognome].filter(Boolean).join(' ');
  return n || p.email;
}

/** Stessa regola della funzione SQL public.puo_segnalare() */
export function puoSegnalare(ruolo: Ruolo) {
  return ruolo !== 'mister';
}
