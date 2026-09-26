// Valori e etichette usati in tutta l'app (devono corrispondere ai tipi SQL)

export type RuoloCampo = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante';
export type Piede = 'destro' | 'sinistro' | 'ambidestro';
export type StatoGiocatore =
  | 'in_lista' | 'in_osservazione' | 'da_rivedere' | 'inserito' | 'da_non_inserire';
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
  in_lista: 'In lista',
  in_osservazione: 'In osservazione',
  da_rivedere: 'Da rivedere',
  inserito: 'Inserito',
  da_non_inserire: 'Da non inserire',
};

/** Stato come compare nello storico: le righe vecchie possono avere stati non più usati (0022) */
const STATI_VECCHI: Record<string, string> = { invitato: 'Invitato', in_prova: 'In prova' };
export function etichettaStato(s: string) {
  return STATI[s as StatoGiocatore] ?? STATI_VECCHI[s] ?? s;
}

export const GIUDIZI: Record<Giudizio, string> = {
  da_prendere: 'Da prendere',
  da_rivedere: 'Da rivedere',
  non_a_livello: 'Non a livello',
};

export const AREE = [
  { chiave: 'tecnica', nome: 'Tecnica', aiuto: 'Conduzione, passaggio, tiro, primo controllo' },
  { chiave: 'motoria', nome: 'Motoria', aiuto: 'Rapidità, coordinazione, equilibrio, resistenza' },
  { chiave: 'tattica', nome: 'Tattica', aiuto: 'Posizione, scelte, lettura del gioco' },
  { chiave: 'mentale', nome: 'Mentale', aiuto: 'Atteggiamento, reazione all’errore, personalità' },
] as const;

export type ChiaveArea = (typeof AREE)[number]['chiave'];

/** Eventi nella scheda del giocatore (tipi SQL tipo_evento / esito_evento, migrazione 0012) */
export type TipoEvento = 'open_day' | 'provino' | 'allenamento_prova' | 'altro';
export type EsitoEvento = 'positivo' | 'da_rivedere' | 'negativo';

export const TIPI_EVENTO: Record<TipoEvento, string> = {
  open_day: 'Open day',
  provino: 'Provino',
  allenamento_prova: 'Allenamento di prova',
  altro: 'Altro',
};

export const ESITI_EVENTO: Record<EsitoEvento, string> = {
  positivo: 'Positivo',
  da_rivedere: 'Da rivedere',
  negativo: 'Negativo',
};

/** Annate selezionabili: dai 5 ai 20 anni rispetto all'anno in corso */
export function annateDisponibili() {
  const anno = new Date().getFullYear();
  return Array.from({ length: 16 }, (_, i) => anno - 5 - i);
}

export function valoreValido<T extends string>(elenco: Record<T, string>, v: unknown): T | null {
  return typeof v === 'string' && v in elenco ? (v as T) : null;
}
