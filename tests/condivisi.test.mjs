// Regole comuni a Scouting e Portale (lib/condivisi.ts → public/portale/js/condivisi.js)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calendarioDi, etaCategoria, coloreAutore, inizialiAutore, coloreAnnata } from '@/lib/condivisi';

test('calendario: fuori casa Trasferta, in casa Merate o Cernusco dal campo; eventi dal luogo', () => {
  assert.equal(calendarioDi({ home: false, venue: 'C.S. COMUNALE - MERATE' }), 'trasferta');
  assert.equal(calendarioDi({ home: true, venue: 'C.S. Comunale - Merate' }), 'merate');
  assert.equal(calendarioDi({ home: true, venue: 'Campo 2 - Cernusco Lombardone' }), 'cernusco');
  assert.equal(calendarioDi({ evento: true, luogo: 'cernusco' }), 'cernusco');
  assert.equal(calendarioDi({ evento: true, luogo: 'altro' }), 'trasferta');
});

test('età della categoria, anche con nomi diversi da "Under"', () => {
  assert.equal(etaCategoria({ category: 'Under 13 - Attività di base' }), 13);
  assert.equal(etaCategoria({ category: 'U12' }), 12);
  assert.equal(etaCategoria({ category: 'Esordienti' }), 12);
  assert.equal(etaCategoria({ category: 'Pulcini misti' }), 10);
  assert.equal(etaCategoria({ category: 'Organizzazione' }), null);
});

test('stessa persona, stesso colore e stesse iniziali nello Scouting e nel Portale', () => {
  // mister: lo Scouting scrive "Mister <firma>", il Portale solo la firma
  assert.equal(coloreAutore('Mister Luca Bianchi · Under 14', true), coloreAutore('Luca Bianchi · Under 14', true));
  assert.equal(inizialiAutore('Mister Luca Bianchi · Under 14'), 'LB');
  // staff: nome e cognome uguali nei due posti
  assert.equal(coloreAutore('Mario Rossi'), coloreAutore('Mario Rossi', false));
  assert.equal(inizialiAutore('Mario Rossi'), 'MR');
});

test('annate vicine con colori diversi', () => {
  assert.notDeepEqual(coloreAnnata(2012), coloreAnnata(2013));
  assert.deepEqual(coloreAnnata(2012), coloreAnnata(2020));
});
