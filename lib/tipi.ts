// Valori e etichette usati in tutta l'app (devono corrispondere ai tipi SQL)

/** Linea di campo; 'movimento' = giocatore di movimento con la linea non ancora indicata (0046) */
export type RuoloCampo = 'portiere' | 'difensore' | 'centrocampista' | 'attaccante' | 'movimento';
export type Piede = 'destro' | 'sinistro' | 'ambidestro';
export type StatoGiocatore =
  | 'in_lista' | 'in_osservazione' | 'da_rivedere' | 'inserito' | 'da_non_inserire';
export type Giudizio = 'da_prendere' | 'da_rivedere' | 'non_a_livello';

export const RUOLI_CAMPO: Record<RuoloCampo, string> = {
  portiere: 'Portiere',
  difensore: 'Difensore',
  centrocampista: 'Centrocampista',
  attaccante: 'Attaccante',
  movimento: 'Movimento',
};
/** Segnalazione (0046): prima portiere o movimento (obbligatorio), poi la linea (facoltativa) */
export const TIPI_GIOCATORE: [RuoloCampo, string][] = [['portiere', 'Portiere'], ['movimento', 'Di movimento']];
export const LINEE: [RuoloCampo, string, string][] = [
  ['difensore', 'Prima linea', 'difesa'], ['centrocampista', 'Seconda linea', 'centrocampo'], ['attaccante', 'Terza linea', 'attacco'],
];
/** Valutazione (0046): ruolo preciso, elenco a discesa; la linea si ricava (stesso elenco di ruoli_precisi() in SQL) */
export type RuoloPreciso = 'portiere' | 'difensore_centrale' | 'terzino' | 'esterno_centrocampo' | 'mediano' | 'mezzala' | 'trequartista' | 'ala' | 'punta';
export const RUOLI_PRECISI: Record<RuoloPreciso, string> = {
  portiere: 'Portiere', difensore_centrale: 'Difensore centrale', terzino: 'Terzino', esterno_centrocampo: 'Esterno di centrocampo',
  mediano: 'Mediano', mezzala: 'Mezzala', trequartista: 'Trequartista', ala: 'Ala', punta: 'Punta',
};
/** Ruolo da mostrare: quello preciso se c'è, se no la linea */
export function etichettaRuolo(g: { ruolo: RuoloCampo | null; ruolo_preciso?: RuoloPreciso | null }): string | null {
  return g.ruolo_preciso ? RUOLI_PRECISI[g.ruolo_preciso] : g.ruolo ? RUOLI_CAMPO[g.ruolo] : null;
}

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
/** Valutazione: voti da 1 a 5 facoltativi (0041, 0044, 0045), divisi in 5 aree nel modulo.
 *  Per una voce nuova: colonna smallint in `valutazioni` (coach_valuta la accetta da sola) e una riga qui e in DETTAGLI_VALUTA del Portale */
export const GRUPPI_VALUTAZIONE = [
  { nome: 'Tecnica', aiuto: 'Cosa sa fare con la palla' },
  { nome: 'Tattica', aiuto: 'Come sta in campo, con e senza palla' },
  { nome: 'Fisico', aiuto: 'Velocità, scatto, coordinazione' },
  { nome: 'Mentale', aiuto: 'Carattere e atteggiamento' },
  { nome: 'Extra', aiuto: 'Contesto e prospettive' },
] as const;
export const DETTAGLI_VALUTAZIONE = [
  { chiave: 'guida_palla', nome: 'Guida della palla', gruppo: 'Tecnica', aiuto: 'Conduzione a testa alta, con entrambi i piedi' },
  { chiave: 'ricezione', nome: 'Ricezione', gruppo: 'Tecnica', aiuto: 'Primo controllo, orientato' },
  { chiave: 'trasmissione', nome: 'Trasmissione', gruppo: 'Tecnica', aiuto: 'Passaggio corto e lungo, tempi e precisione' },
  { chiave: 'calciata', nome: 'Calciata', gruppo: 'Tecnica', aiuto: 'Tiro e lancio, forza e precisione' },
  { chiave: 'colpo_di_testa', nome: 'Colpo di testa', gruppo: 'Tecnica', aiuto: 'Tempo di stacco e precisione, in attacco e in difesa' },
  { chiave: 'marcamento', nome: 'Marcamento', gruppo: 'Tattica', aiuto: 'Presa dell’uomo, posizione tra avversario e porta' },
  { chiave: 'smarcamento', nome: 'Smarcamento', gruppo: 'Tattica', aiuto: 'Movimenti per ricevere, attacco dello spazio' },
  { chiave: 'contrasto', nome: 'Contrasto', gruppo: 'Tattica', aiuto: 'Tempo e decisione nel recupero palla' },
  { chiave: 'dribbling', nome: 'Dribbling', gruppo: 'Tattica', aiuto: 'Quando e dove saltare l’uomo' },
  { chiave: 'velocita', nome: 'Velocità', gruppo: 'Fisico', aiuto: 'Allungo, con e senza palla' },
  { chiave: 'accelerazione', nome: 'Accelerazione', gruppo: 'Fisico', aiuto: 'Scatto nei primi metri' },
  { chiave: 'agilita', nome: 'Agilità', gruppo: 'Fisico', aiuto: 'Cambi di direzione, equilibrio, coordinazione' },
  { chiave: 'reattivita', nome: 'Reattività', gruppo: 'Fisico', aiuto: 'Prontezza nei primi passi e sulle seconde palle' },
  { chiave: 'spunti', nome: 'Spunti, estro e coraggio', gruppo: 'Mentale', aiuto: 'Osa l’uno contro uno, fantasia, non si nasconde' },
  { chiave: 'concentrazione', nome: 'Concentrazione', gruppo: 'Mentale', aiuto: 'Attento per tutta la partita, pochi errori di distrazione' },
  { chiave: 'motivazione', nome: 'Motivazione', gruppo: 'Mentale', aiuto: 'Voglia di migliorare, impegno, ascolto' },
  { chiave: 'famiglia', nome: 'Famiglia', gruppo: 'Extra', aiuto: 'Disponibilità e collaborazione della famiglia' },
  { chiave: 'potenziale', nome: 'Potenziale', gruppo: 'Extra', aiuto: 'Dove può arrivare' },
  { chiave: 'livello_attuale', nome: 'Livello attuale', gruppo: 'Extra', aiuto: 'Quanto vale oggi rispetto alla sua annata' },
] as const;
export type ChiaveDettaglio = (typeof DETTAGLI_VALUTAZIONE)[number]['chiave'];
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
