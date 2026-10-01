// Portieri dei preparatori (lib/portieri.ts): categoria dalle rose delle squadre, gruppi secondo le categorie dei preparatori
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { categorieDeiPortieri, gruppiPortieri } from '@/lib/portieri';

const portieri = [
  { id: 'a', name: 'Rossi Luca' }, { id: 'b', name: 'Bianchi Marco' }, { id: 'c', name: 'Verdi Pietro' },
  { id: 'd', name: 'Neri Paolo' }, { id: 'e', name: 'Gialli Ugo' },
];
const rose = [
  { category: 'Under 15', players: [{ name: 'Luca Rossi' }, { name: 'Altro Giocatore' }] },
  { category: 'Under 14', players: [{ name: 'BIANCHI marco' }] },
  { category: 'Under 17', players: [{ name: 'Verdi Pietro' }] },
  { category: 'Under 16', players: [{ name: 'Verdi Pietro' }] },
  { category: 'Under 11', players: [{ name: 'Neri Paolo' }] },
  { name: 'Organizzazione', players: [{ name: 'Gialli Ugo' }] },
];

test('categoria dalle rose: nome in qualsiasi ordine, la più giovane se è in più rose, nessuna se non si trova', () => {
  assert.deepEqual(categorieDeiPortieri(portieri, rose), { a: 15, b: 14, c: 16, d: 11 });
});

test('un gruppo per preparatore con le sue categorie, poi gli altri', () => {
  const eta = categorieDeiPortieri(portieri, rose);
  const g = gruppiPortieri(portieri, eta, [
    { name: 'Mario', eta: [14, 15] }, { name: 'Senza categorie' }, { name: 'Gino', eta: [16, 15] },
  ]);
  assert.deepEqual(g.map((x) => [x.titolo, x.ids]), [
    ['Mario · U15, U14', ['a', 'b']],
    ['Gino · U16, U15', ['c', 'a']],
    ['Altri portieri', ['d', 'e']],
  ]);
});

test('senza preparatori con categorie: un solo gruppo', () => {
  assert.deepEqual(gruppiPortieri(portieri, {}, [{ name: 'Mario' }]).map((x) => x.titolo), ['Portieri']);
  assert.deepEqual(gruppiPortieri([], {}, []), []);
});
