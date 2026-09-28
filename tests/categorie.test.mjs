// Categorie ed età sportiva (lib/categorie.ts): età sportiva = anno di fine stagione − annata; la stagione parte a luglio.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fineStagione, categoriaDaAnnata, etaDaCategoria, giocaInGara } from '@/lib/categorie';

test('la stagione cambia a luglio', () => {
  assert.equal(fineStagione(new Date('2026-06-30T12:00:00Z')), 2026);
  assert.equal(fineStagione(new Date('2026-07-01T12:00:00Z')), 2027);
  assert.equal(fineStagione(new Date('2027-03-15T12:00:00Z')), 2027);
});

test("categoria dall'annata (stagione 2026/27)", () => {
  assert.equal(categoriaDaAnnata(2013, 2027), 'Under 14 - 2013');
  assert.equal(categoriaDaAnnata(2014, 2027), 'Esordienti - 2014');
  assert.equal(categoriaDaAnnata(2010, 2027), 'Under 17 - 2010');
  assert.equal(categoriaDaAnnata(2019, 2027), 'Primi calci - 2019');
});

test('età da una categoria scritta a mano', () => {
  assert.deepEqual(etaDaCategoria('Under 14 - Provinciale', 2027), { min: 14, max: 14 });
  assert.deepEqual(etaDaCategoria('Esordienti', 2027), { min: 12, max: 13 });
  assert.equal(etaDaCategoria('', 2027), null);
});

test('un giocatore gioca una gara solo della sua squadra e della sua età', () => {
  const gara = { categoria: 'Under 14', casa_id: 'noi', trasferta_id: 'loro' };
  assert.equal(giocaInGara({ annata: 2013, categoria: null, societa_id: 'noi' }, gara, 2027), true);
  assert.equal(giocaInGara({ annata: 2013, categoria: null, societa_id: 'loro' }, gara, 2027), true);
  assert.equal(giocaInGara({ annata: 2012, categoria: null, societa_id: 'noi' }, gara, 2027), false, 'fuori età');
  assert.equal(giocaInGara({ annata: 2013, categoria: null, societa_id: 'altri' }, gara, 2027), false, 'altra società');
  assert.equal(giocaInGara({ annata: 2012, categoria: 'Under 14', societa_id: 'noi' }, gara, 2027), true, 'gioca sotto età');
});
