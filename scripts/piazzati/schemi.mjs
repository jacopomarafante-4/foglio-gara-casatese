// Calci piazzati da aggiungere al database comune del Portale (shared/schemes), ridisegnati da due articoli tecnici
// (angoli e punizioni a favore; difesa mista uomo-zona sull'angolo contro). Solo schemi, nessun dato di persone.
// Coordinate in metri come nel Portale: x = distanza dal centro della porta (bandierina dell'angolo a destra, x = 34),
// y = distanza dalla linea di fondo. Frecce: piena = palla, tratteggiata = movimento del giocatore.
// Pedina: [numero di ruolo, x, y, compito, etichetta?]. Freccia: [x1, y1, x2, y2, tratteggiata?]. Scritta: [x, y, testo].
const ANGOLO = { x: 33.3, y: 0.7 };
const BATT = [10, 31.3, -1.6, 'Battitore'];

export const SCHEMI = [
  {
    id: 's_ang_spizzata', name: 'Angolo a favore 3', subtitle: 'Spizzata sul primo palo', side: 'favore', ball: ANGOLO,
    note: 'Cross a rientrare sul primo palo: due vanno incontro per spizzare, uno esce dalla porta in diagonale, due sul secondo palo.',
    tokens: [BATT, [9, 7, 2.5, 'Spizzata'], [11, 3.5, 2.5, 'Spizzata'], [4, 0, 0.8, 'Uscita dalla porta'],
      [5, -4.5, 2.2, 'Secondo palo'], [6, -6.5, 5.5, 'Secondo palo'], [8, 7.5, 17.5, 'Ribattuta'], [7, -9.5, 17.5, 'Ribattuta'],
      [2, 0, 25, 'Copertura'], [3, 5, 29, 'Copertura']],
    draw: [[33.3, 0.7, 6, 3], [7, 2.5, 9.5, 2.2, 1], [3.5, 2.5, 6, 2, 1], [0, 0.8, 2.5, 5.5, 1], [-6.5, 5.5, -4.5, 4.5, 1]],
  },
  {
    id: 's_ang_scambio', name: 'Angolo a favore 4', subtitle: 'Scambio corto, cross sul secondo palo', side: 'favore', ball: ANGOLO,
    note: 'Il primo del palo viene incontro e restituisce al battitore, che crossa di prima sul secondo palo.',
    tokens: [BATT, [7, 8.5, 1.5, 'Scambio'], [9, 3, 1.5, 'Attacco area'], [11, 0, 1.5, 'Attacco area'],
      [5, -10, 4.5, 'Secondo palo'], [6, -5.5, 7, 'Secondo palo'], [8, 11.5, 18, 'Limite area'], [4, -4.5, 18, 'Limite area'],
      [2, 1, 26, 'Copertura'], [3, 6, 30, 'Copertura']],
    draw: [[33.3, 0.7, 19, 2], [8.5, 1.5, 18, 2, 1], [19, 2, 26, 5.5], [31.3, -1.6, 26.5, 5, 1], [26, 5.5, -4.5, 3],
      [3, 1.5, 4, 6, 1], [0, 1.5, 1, 6, 1], [-10, 4.5, -5.5, 3, 1], [-5.5, 7, -3, 4, 1]],
  },
  {
    id: 's_ang_blocchi', name: 'Angolo a favore 5', subtitle: 'Tutti in area, tiro da fuori', side: 'favore', ball: ANGOLO,
    note: 'Quando gli avversari lasciano un solo uomo in ribattuta: tutti in area a fare blocco, palla dietro per il tiro.',
    tokens: [BATT, [9, 7.5, 1.7, 'Blocco'], [11, 4.3, 1.7, 'Blocco'], [4, 1.2, 1, 'Blocco'], [5, -3.6, 6.4, 'Blocco'],
      [6, -6, 4.6, 'Blocco'], [3, 2, 10, 'Blocco'], [7, 9, 17, 'Finta'], [8, 4, 25, 'Tiro'], [2, -10, 29, 'Copertura']],
    draw: [[33.3, 0.7, 4.5, 24.5], [4, 25, -1, 1], [9, 17, 19, 7, 1]],
  },
  {
    id: 's_ang_triangolo', name: 'Angolo a favore 6', subtitle: 'Triangolo sul primo palo', side: 'favore', ball: ANGOLO,
    note: 'Triangolo tra i primi due sul primo palo, poi palla in mezzo sul secondo palo.',
    tokens: [BATT, [7, 8.5, 1, 'Triangolo'], [9, 4, 3, 'Triangolo'], [11, 1, 1.5, 'Attacco area'], [5, -2.5, 1.5, 'Attacco area'],
      [6, -5, 4, 'Attacco area'], [4, -3, 6.5, 'Attacco area'], [8, 5.5, 17.5, 'Limite area'], [3, -3.6, 17.5, 'Limite area'],
      [2, 0, 28, 'Copertura']],
    draw: [[33.3, 0.7, 14, 3], [8.5, 1, 14, 3, 1], [14, 3, 10, 6.5], [4, 3, 10, 6.5, 1], [10, 6.5, -3.5, 2.5]],
  },
  {
    id: 's_ang_fuoriarea', name: 'Angolo a favore 7', subtitle: 'Scambio, passaggio fuori area e cross', side: 'favore', ball: ANGOLO,
    note: 'Scambio col primo del palo, passaggio al compagno fuori area, cross sul secondo palo.',
    tokens: [BATT, [7, 9.5, 1.5, 'Scambio'], [8, 15.5, 19, 'Cross da fuori'], [9, 4.3, 1.5, 'Attacco area'], [11, 0.7, 1, 'Attacco area'],
      [5, -6, 4, 'Secondo palo'], [6, -8, 1.5, 'Secondo palo'], [4, -3.7, 17.7, 'Limite area'], [2, 0, 26, 'Copertura'],
      [3, 8, 29, 'Copertura']],
    draw: [[33.3, 0.7, 20, 1.5], [9.5, 1.5, 19.5, 1.5, 1], [20, 1.5, 26, 5], [31.3, -1.6, 26.5, 4.5, 1], [26, 5, 15.5, 18.5],
      [15.5, 19, -3.5, 3], [-6, 4, -3, 3, 1], [-8, 1.5, -3.5, 5.5, 1]],
  },
  {
    id: 's_pun_lat_rientro', name: 'Punizione laterale a favore 1', subtitle: 'A rientrare, saltatori che tornano dal fuorigioco', side: 'favore',
    ball: { x: 28, y: 8 },
    note: 'I due migliori di testa partono in fuorigioco, rientrano durante la rincorsa e ripartono sul calcio.',
    tokens: [[10, 29.5, 9.8, 'Battitore'], [5, 1.5, 3.5, 'Saltatore'], [6, -2.5, 3.5, 'Saltatore'], [7, 10.8, 10.5, 'Primo palo'],
      [9, -8, 8.8, 'Secondo palo'], [11, -14, 8.8, 'Secondo palo'], [8, 7.8, 17.8, 'Limite area'], [4, -4, 17.8, 'Limite area'],
      [2, 0, 27, 'Copertura'], [3, 12, 27, 'Copertura']],
    draw: [[28, 8, 0, 5.5], [1.5, 3.5, 1.5, 8.5, 1], [-2.5, 3.5, -2.5, 8.5, 1], [10.8, 10.5, 8, 7, 1], [-14, 8.8, -6, 2, 1]],
  },
  {
    id: 's_pun_lat_blocco', name: 'Punizione laterale a favore 2', subtitle: 'Blocco e inserimento sul dischetto', side: 'favore',
    ball: { x: 28, y: 8 },
    note: 'Se lasciano libera la traiettoria centrale: gli altri si portano via i marcatori, l\'ultimo gira a semicerchio e colpisce all\'altezza del dischetto.',
    tokens: [[10, 29.5, 9.8, 'Battitore'], [7, 10.2, 7.6, 'Porta via il marcatore'], [9, 3.5, 7.6, 'Porta via il marcatore'],
      [5, -3.1, 7.6, 'Porta via il marcatore'], [4, -9.2, 7.6, 'Blocco'], [6, -17, 6.5, 'Colpitore'], [8, 6, 19, 'Limite area'],
      [11, -6, 19, 'Limite area'], [2, 0, 28, 'Copertura'], [3, 14, 26, 'Copertura']],
    draw: [[28, 8, 0, 11], [10.2, 7.6, 8, 2.5, 1], [3.5, 7.6, 3, 2, 1], [-3.1, 7.6, -3, 2, 1], [-17, 6.5, -10, 12, 1], [-10, 12, -1.5, 11, 1]],
  },
  {
    id: 's_pun_cen_scavetto', name: 'Punizione centrale a favore 1', subtitle: 'Tocco, stop e palla sopra la barriera', side: 'favore',
    ball: { x: 7.3, y: 21 },
    note: 'Quando non c\'è l\'uomo dietro la barriera: due sulla palla (un destro e un sinistro), il primo tocca, il secondo ferma e calcia a scavalcare la barriera per l\'inserimento.',
    tokens: [[10, 7.4, 23, 'Tocco'], [8, 3.5, 24.5, 'Scavetto'], [9, 0.5, 15.5, 'Inserimento'], [11, -4, 15.5, 'Attacco area'],
      [5, -8.5, 15.5, 'Attacco area'], [6, -13, 15.5, 'Attacco area'], [4, -17.5, 15.5, 'Attacco area'], [7, 26, 16, 'Largo'],
      [2, 0, 29, 'Copertura'], [3, -12, 29, 'Copertura']],
    draw: [[7.3, 21, 4, 22.5], [4, 22.5, 1.5, 3], [0.5, 15.5, 2, 4, 1], [-4, 15.5, -3, 6, 1], [-8.5, 15.5, -7, 7, 1], [-17.5, 15.5, -11, 12, 1]],
    lines: [[9.5, 12.4, 2, 12.4]], marks: [[5.8, 11.2, 'Barriera']],
  },
  {
    id: 's_pun_cen_triangolo', name: 'Punizione centrale a favore 2', subtitle: 'Triangolo e blocco centrale', side: 'favore',
    ball: { x: 12.4, y: 24.6 },
    note: 'Il battitore serve il compagno che viene incontro (liberato da un blocco) e si inserisce in area per il ritorno.',
    tokens: [[10, 13.5, 25.5, 'Battitore'], [8, 8.3, 26, 'Seconda palla'], [9, -12, 15.5, 'Triangolo'], [11, -5.6, 15.5, 'Blocco'],
      [5, 3, 15.5, 'Attacco area'], [6, -18, 15.5, 'Attacco area'], [4, -23, 16, 'Attacco area'], [7, 26, 16, 'Largo'],
      [2, 2, 29, 'Copertura'], [3, -10, 29, 'Copertura']],
    draw: [[12.4, 24.6, -6.8, 21], [-12, 15.5, -7.2, 20.5, 1], [-5.6, 15.5, -10.5, 15.5, 1], [-6.8, 21, 4, 8.5], [13.5, 25.5, 4.5, 8, 1]],
    lines: [[11.4, 12.5, 3.8, 12.5]], marks: [[7.6, 11.3, 'Barriera']],
  },
  {
    id: 's_pun_cen_saltatori', name: 'Punizione centrale a favore 3', subtitle: 'Tre saltatori, due sul secondo palo', side: 'favore',
    ball: { x: 13.2, y: 24.7 },
    note: 'Tre saltatori in fila: dopo l\'accordo due attaccano il secondo palo, il terzo va in mezzo.',
    tokens: [[10, 14.3, 25.8, 'Battitore'], [8, 7.9, 26, 'Seconda palla'], [9, 4.9, 15.4, 'Attacco area'], [5, -5.5, 15.4, 'Saltatore'],
      [6, -5.5, 17.6, 'Saltatore'], [4, -5.5, 19.9, 'Saltatore'], [7, 26, 16.5, 'Largo'], [11, -23, 17.7, 'Rientro'],
      [2, 0, 29, 'Copertura'], [3, -12, 29, 'Copertura']],
    draw: [[13.2, 24.7, -4.5, 3], [-5.5, 15.4, -3.5, 3.5, 1], [-5.5, 17.6, -7, 4.5, 1], [-5.5, 19.9, 2, 9, 1], [4.9, 15.4, 3, 6, 1], [-23, 17.7, -11, 17.7, 1]],
    lines: [[13, 13, 5, 13]], marks: [[9, 11.8, 'Barriera']],
  },
  {
    id: 's_ang_sfavore_misto', name: 'Angolo a sfavore 2', subtitle: 'Difesa mista: 6 a zona, 4 a uomo', side: 'sfavore', ball: ANGOLO,
    note: 'Zone A–F: 2 primo palo, 5 area piccola, 3 lato vicino, 6 dischetto, 8 limite, 10 lato lontano. 4-7-9-11 a uomo sui più pericolosi. Su ribattuta: palla in aria = palla coperta, si sale (ultima linea 2 e 5); in pressione 3, 8 o 10.',
    tokens: [[1, 0, 0.9, 'Portiere'], [2, 5.7, 1.8, 'Zona', 'A'], [5, 0.4, 3.2, 'Zona', 'B'], [3, 8.7, 6.5, 'Zona', 'C'],
      [6, 0, 8.5, 'Zona', 'D'], [8, 0.3, 14.6, 'Zona', 'E'], [10, -7.9, 5.2, 'Zona', 'F'], [4, 4.3, 5.8, 'A uomo', 'M'],
      [7, 3.3, 11.5, 'A uomo', 'M'], [9, -3.3, 6.2, 'A uomo', 'M'], [11, -5.6, 9.5, 'A uomo', 'M']],
    draw: [],
    // lettere delle zone sopra le pedine (A primo palo … F lato lontano), M = marcatura a uomo
  },
];

/** Lo schema nel formato del Portale (shared/schemes) */
export const comePortale = (s) => ({
  id: s.id, name: s.name, subtitle: s.subtitle ?? '', side: s.side, note: s.note ?? '', legend: 'Freccia piena = palla · tratteggiata = movimento',
  ball: { ...s.ball },
  tokens: s.tokens.map(([slot, x, y, role, tag], i) => ({ id: `${s.id}_t${i + 1}`, slot, x, y, role, tag: tag ?? '' })),
  draw: [
    ...s.draw.map(([x1, y1, x2, y2, tratt]) => ({ type: 'arrow', dashed: !!tratt, x1, y1, x2, y2 })),
    ...(s.lines ?? []).map(([x1, y1, x2, y2, tratt]) => ({ type: 'line', dashed: !!tratt, x1, y1, x2, y2 })),
  ],
  marks: (s.marks ?? []).map(([x, y, text]) => ({ x, y, text })),
});
