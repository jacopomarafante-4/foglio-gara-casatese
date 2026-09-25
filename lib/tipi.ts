// Valori e etichette usati in tutta l'app (devono corrispondere ai tipi SQL)

export type RuoloCampo = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante';
export type Piede = 'destro' | 'sinistro' | 'ambidestro';
export type StatoGiocatore =
  | 'segnalato' | 'da_rivedere' | 'contattato' | 'invitato' | 'in_prova' | 'inserito' | 'chiuso';
export type Giudizio = 'da_prendere' | 'da_rivedere' | 'non_a_livello';

export const RUOLI_CAMPO: Record<RuoloCampo, string> = {
  portiere: 'Portiere',
  difensore: 'Difensore',
  centrocampista: 'Centrocampista',
  attaccante: 'Attaccante',
};

export const PIEDI: Record<Piede, string> = {
  destro: 'Destro',
  sinistro: 'Sinistro',
  ambidestro: 'Ambidestro',
};

export const STATI: Record<StatoGiocatore, string> = {
  segnalato: 'Segnalato',
  da_rivedere: 'Da rivedere',
  contattato: 'Contattato',
  invitato: 'Invitato',
  in_prova: 'In prova',
  inserito: 'Inserito',
  chiuso: 'Chiuso',
};

export const GIUDIZI: Record<Giudizio, string> = {
  da_prendere: 'Da prendere',
  da_rivedere: 'Da rivedere',
  non_a_livello: 'Non a livello',
};

export const MOTIVI_CHIUSURA = [
  'Non a livello',
  'Scelto altro progetto',
  'Non presentato',
  'Posti in squadra esauriti',
  'Da rivalutare più avanti',
  'Altro',
];

export const AREE = [
  { chiave: 'tecnica', nome: 'Tecnica', aiuto: 'Conduzione, passaggio, tiro, primo controllo' },
  { chiave: 'motoria', nome: 'Motoria', aiuto: 'Rapidità, coordinazione, equilibrio, resistenza' },
  { chiave: 'tattica', nome: 'Tattica', aiuto: 'Posizione, scelte, lettura del gioco' },
  { chiave: 'mentale', nome: 'Mentale', aiuto: 'Atteggiamento, reazione all’errore, personalità' },
] as const;

export type ChiaveArea = (typeof AREE)[number]['chiave'];

/** Annate selezionabili: dai 5 ai 20 anni rispetto all'anno in corso */
export function annateDisponibili() {
  const anno = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => anno - 5 - i);
}

export function valoreValido<T extends string>(elenco: Record<T, string>, v: unknown): T | null {
  return typeof v === 'string' && v in elenco ? (v as T) : null;
}
