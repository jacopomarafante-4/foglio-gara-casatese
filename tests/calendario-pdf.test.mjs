// Calendari ufficiali in PDF (lib/calendario-pdf.ts, lib/leggi-pdf.ts) e loro importazione (lib/importa-calendario-ufficiale.ts):
// un PDF finto creato qui con jsPDF (giornate, partite, elenco campi con i bordi), poi regole di nomi, date e calendario delle squadre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jsPDF } from 'jspdf';
import { pagineDelPdf } from '@/lib/leggi-pdf';
import { indovinaCategoria, leggi, nomeBello, prepara, pulito, somiglianza, giornoPartita } from '@/lib/calendario-pdf';
import { categoriaDellaSquadra, istante, unisciCalendario } from '@/lib/importa-calendario-ufficiale';

const SQUADRE = ['ACADEMY CASATESE', 'LECCO ALTA', 'S.ZENO', 'ROVINATA', 'VERCURAGO', 'BARZANO', 'OSNAGO', 'CASSAGO'];
const CAMPI = [
  ['U.S.D. ACADEMY CASATESE MERATE', '101', 'C.S. COMUNALE - MERATE', 'VIA BERGAMO 12', '15:00', 'Sabato'],
  ['ORATORI LECCO ALTA', '102', 'CENTRO SPORTIVO - LECCO', 'VIA BUOZZI 34', '10:30', 'Domenica'],
  ['G.S. S.ZENO A.S.D.', '103', 'PARROCCHIALE - OLGIATE', 'PIAZZA SAN ZENONE', '18:30', 'Sabato'],
  ['POL. ROVINATA', '104', 'AL BIONE - LECCO', 'VIA BUOZZI 38', '9:30', 'Domenica'],
  ['A.C. VERCURAGO', '105', 'COMUNALE - VERCURAGO', 'VIA ADDA 1', '11:30', 'Domenica'],
  ['A.S.D. O.BARZANO', '106', 'ORATORIO - BARZANO', 'VIA GIOVANNI XXIII', '10:30', 'Domenica'],
  ['AUDACE OSNAGO', '107', 'COMUNALE - OSNAGO', 'VIA ROMA 1', '17:00', 'Sabato'],
  ['ORATORIO CASSAGO', '108', 'ORATORIO - CASSAGO', 'VIA DANTE 2', '15:30', 'Sabato'],
];

/** PDF finto: pagina 1 con 2 giornate da 4 partite, pagina 2 con l'elenco campi in una tabella con i bordi */
function pdfFinto() {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14); doc.text('GIRONE A', 380, 40);
  doc.setFontSize(9);
  for (const [c, n, a, r] of [[0, 1, '13/09/2026', '10/01/2027'], [1, 2, '20/09/2026', '17/01/2027']]) {
    const x = 60 + c * 300;
    doc.text(`GIORNATA ${n}`, x + 60, 80);
    doc.text(`A. ${a}`, x, 95); doc.text(`R. ${r}`, x + 110, 95);
    for (let i = 0; i < 4; i++) {
      const casa = SQUADRE[(i * 2 + c) % 8], fuori = SQUADRE[(i * 2 + 1 + c * 3) % 8];
      doc.text(casa, x + 100, 115 + i * 14, { align: 'right' }); doc.text('-', x + 110, 115 + i * 14); doc.text(fuori, x + 120, 115 + i * 14);
    }
  }
  doc.addPage();
  doc.setFontSize(12); doc.text('GIRONE A', 60, 40); doc.setFontSize(8);
  const xs = [50, 220, 260, 450, 600, 650, 720], intest = ['Società', 'N.', 'Campo / Località', 'Indirizzo', 'Orario', 'Giorno'];
  const righe = [intest, ...CAMPI];
  righe.forEach((r, i) => { const y = 60 + i * 20; r.forEach((t, k) => doc.text(t, xs[k] + 4, y + 13)); });
  for (let i = 0; i <= righe.length; i++) doc.line(xs[0], 60 + i * 20, xs[xs.length - 1], 60 + i * 20);
  for (const x of xs) doc.line(x, 60, x, 60 + righe.length * 20);
  return new Uint8Array(doc.output('arraybuffer'));
}

test('PDF finto: giornate, partite, andata e ritorno, elenco campi dalla tabella con i bordi', async () => {
  const pagine = await pagineDelPdf(pdfFinto());
  assert.equal(pagine.length, 2);
  const l = leggi(pagine, 2026);
  assert.deepEqual(Object.keys(l.gironi), ['A']);
  const { partite: lette, campi } = l.gironi.A;
  assert.equal(lette.length, 8);
  assert.deepEqual(lette.find((p) => p.casa === 'ACADEMY CASATESE'), { giornata: 1, andata: '2026-09-13', ritorno: '2027-01-10', casa: 'ACADEMY CASATESE', trasferta: 'LECCO ALTA' });
  assert.equal(campi.length, 8);
  assert.deepEqual(campi[0], { societa: 'U.S.D. ACADEMY CASATESE MERATE', codice: '101', campo: 'C.S. COMUNALE - MERATE', ora: '15:00', indirizzo: 'VIA BERGAMO 12', giorno: 'sabato' });

  const { partite, dubbi } = prepara(l, 'Under 15 Provinciali Lecco', 2026, 'finto.pdf');
  assert.equal(partite.length, 16);
  assert.deepEqual(dubbi, []);
  const and = partite.find((p) => p.casa.calendario === 'ACADEMY CASATESE' && p.turno === 'andata');
  // domenica 13/09 nel calendario, ma il campo di casa gioca il sabato → 12/09 alle 15:00, nel campo della squadra di casa
  assert.deepEqual([and.data, and.ora, and.campo, and.codice_campo, and.casa.nome, and.trasferta.nome],
    ['2026-09-12', '15:00', 'C.S. COMUNALE - MERATE', '101', 'Academy Casatese Merate', 'Oratori Lecco Alta']);
  const rit = partite.find((p) => p.trasferta.calendario === 'ACADEMY CASATESE' && p.turno === 'ritorno' && p.giornata === 1);
  assert.deepEqual([rit.casa.calendario, rit.data, rit.ora, rit.campo], ['LECCO ALTA', '2027-01-10', '10:30', 'CENTRO SPORTIVO - LECCO']);
});

test('nomi: chiave di confronto e nome da mostrare', () => {
  assert.equal(pulito('U.S.D. CASATESE MERATE A.S.D.'), 'CASATESEMERATE');
  assert.equal(pulito('ACC. PAVESE'), pulito('ACCADEMIA PAVESE'));
  assert.equal(nomeBello('U.S.D. CASATESE MERATE A.S.D.'), 'Casatese Merate');
  assert.equal(nomeBello('POL. O.S.G.B. MERATE'), 'Pol. O.S.G.B. Merate');
  assert.equal(Math.round(somiglianza('abcd', 'bcde') * 100), 75);   // come difflib
});

test('date: giorno del campo, istante italiano, stagione', () => {
  assert.equal(giornoPartita('2026-09-13', 'sabato'), '2026-09-12');
  assert.equal(giornoPartita('2026-09-12', 'domenica'), '2026-09-13');
  assert.equal(giornoPartita('2026-09-13', 'domenica'), '2026-09-13');
  assert.equal(istante('2026-10-18', '10:30'), '2026-10-18T08:30:00.000Z');
  assert.equal(istante('2027-01-10', '10:30'), '2027-01-10T09:30:00.000Z');
});

test('categoria: indovinata dal PDF e squadra che la gioca', () => {
  assert.equal(indovinaCategoria('ALLIEVI REG.LI UNDER 17 ELITE', 'x.pdf'), 'Under 17 Élite');
  assert.equal(indovinaCategoria('GIOVANISSIMI PROVINCIALI U.15', 'CALENDARIO U15 LECCO.pdf'), 'Under 15 Provinciali Lecco');
  assert.equal(indovinaCategoria('JUNIORES', '10_JUNIORES U19 REG.pdf'), 'Under 19 Juniores Regionali');
  assert.ok(categoriaDellaSquadra('Under 16 - Regionale Élite', 'Under 16 Élite'));
  assert.ok(!categoriaDellaSquadra('Under 16 - Regionale Élite', 'Under 16 Regionali'));
  assert.ok(categoriaDellaSquadra('Under 14 - Provinciale', 'Under 14 Provinciali Lecco'));
});

test('calendario della squadra: collega per avversario, data e campo ufficiali, aggiunge le mancanti, non tocca le amichevoli', () => {
  const noi = 'n1';
  const gara = (id, iso, casa, avv, extra = {}) => ({ id, data_ora: iso, categoria: 'Under 14 Provinciali Lecco', casa_id: casa ? noi : 'x', trasferta_id: casa ? 'x' : noi,
    casa_nome: casa ? 'Academy Casatese Merate' : avv, trasferta_nome: casa ? avv : 'Academy Casatese Merate', campo: 'C.S. COMUNALE', indirizzo: 'VIA ROMA',
    lat: null, lon: null, ora_da_definire: false, stato: 'calendario', comunicato: null, ...extra });
  const prima = [
    { id: 'a', date: '2026-09-20', time: '10:00', opponent: 'G.S. S.Zeno', home: true },
    { id: 'b', date: '2026-09-21', time: '18:00', opponent: 'S.Zeno', home: false, friendly: true, ll: '45,9' },
  ];
  const gare = [gara('g1', '2026-09-19T13:00:00.000Z', true, 'S.Zeno'), gara('g2', '2026-09-27T08:30:00.000Z', false, 'Vercurago', { stato: 'variata', comunicato: 'C.U. 5' })];
  const u = unisciCalendario(prima, gare, noi, () => 'nuovo');
  assert.equal(u.aggiunte, 1); assert.equal(u.aggiornate, 1);
  assert.deepEqual(u.matches[0], { id: 'a', date: '2026-09-19', time: '15:00', opponent: 'G.S. S.Zeno', home: true, garaId: 'g1', stato: 'calendario', comunicato: '', venue: 'C.S. COMUNALE', address: 'VIA ROMA' });
  assert.deepEqual(u.matches[1], prima[1]);   // amichevole: resta com'è
  assert.deepEqual(u.matches[2], { id: 'nuovo', date: '2026-09-27', time: '10:30', venue: 'C.S. COMUNALE', address: 'VIA ROMA', opponent: 'Vercurago', home: false, garaId: 'g2', stato: 'variata', comunicato: 'C.U. 5' });
  // una seconda volta non cambia più niente
  const di = unisciCalendario(u.matches, gare, noi, () => 'altro');
  assert.equal(di.aggiunte + di.aggiornate, 0);
});
