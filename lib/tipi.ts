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

/** Segnalazione: voti da 1 a 5 facoltativi (0041). Piede forte/debole non si chiedono più: c'è "Piede preferito";
 *  le colonne piede_forte e piede_debole restano per le segnalazioni già fatte */
export const DETTAGLI_SEGNALAZIONE = [
  { chiave: 'statura', nome: 'Statura' },
  { chiave: 'forza', nome: 'Forza' },
] as const;
/** Prima impressione della segnalazione (0042): si filtra e si ordina l'elenco giocatori per quella dell'ultima segnalazione */
export type Impressione = 'positiva' | 'da_rivedere' | 'negativa';
export const IMPRESSIONI: Record<Impressione, string> = { positiva: 'Positiva', da_rivedere: 'Da rivedere', negativa: 'Negativa' };
/** Piede preferito nella segnalazione (stesse scelte del tipo piede, "Entrambi" = ambidestro) */
export const SCELTE_PIEDE: [Piede, string][] = [['destro', 'Destro'], ['sinistro', 'Sinistro'], ['ambidestro', 'Entrambi']];
/** Valutazione: voti da 1 a 5 facoltativi (0041, 0044), divisi in gruppi nel modulo */
export const GRUPPI_VALUTAZIONE = ['Con la palla', 'Senza palla', 'Fisico', 'Mentale'] as const;
export const DETTAGLI_VALUTAZIONE = [
  { chiave: 'spunti', nome: 'Spunti, estro e coraggio', gruppo: 'Con la palla', aiuto: 'Uno contro uno, fantasia, non si nasconde' },
  { chiave: 'guida_palla', nome: 'Guida della palla', gruppo: 'Con la palla', aiuto: 'Conduzione a testa alta, con entrambi i piedi' },
  { chiave: 'ricezione', nome: 'Ricezione', gruppo: 'Con la palla', aiuto: 'Primo controllo, orientato' },
  { chiave: 'trasmissione', nome: 'Trasmissione', gruppo: 'Con la palla', aiuto: 'Passaggio corto e lungo, tempi e precisione' },
  { chiave: 'calciata', nome: 'Calciata', gruppo: 'Con la palla', aiuto: 'Tiro e lancio, forza e precisione' },
  { chiave: 'colpo_di_testa', nome: 'Colpo di testa', gruppo: 'Con la palla', aiuto: 'Tempo di stacco e precisione, in attacco e in difesa' },
  { chiave: 'marcamento', nome: 'Marcamento', gruppo: 'Senza palla', aiuto: 'Presa dell’uomo, posizione tra avversario e porta' },
  { chiave: 'smarcamento', nome: 'Smarcamento', gruppo: 'Senza palla', aiuto: 'Movimenti per ricevere, attacco dello spazio' },
  { chiave: 'contrasto', nome: 'Contrasto', gruppo: 'Senza palla', aiuto: 'Tempo e decisione nel recupero palla' },
  { chiave: 'velocita', nome: 'Velocità', gruppo: 'Fisico', aiuto: 'Allungo, con e senza palla' },
  { chiave: 'reattivita', nome: 'Reattività', gruppo: 'Fisico', aiuto: 'Prontezza nei primi passi e sulle seconde palle' },
  { chiave: 'concentrazione', nome: 'Concentrazione', gruppo: 'Mentale', aiuto: 'Attento per tutta la partita, pochi errori di distrazione' },
] as const;

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
