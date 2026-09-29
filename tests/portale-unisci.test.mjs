// Unione di due modifiche fatte in contemporanea sulla stessa scheda del Portale (public/portale/js/unisci.js, 0048)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({});
vm.runInContext(readFileSync('public/portale/js/unisci.js', 'utf8'), contesto, { filename: 'unisci.js' });
const unisci = vm.runInContext('unisci', contesto);
const u = (b, m, l) => JSON.parse(JSON.stringify(unisci(b, m, l)));

test('se ho cambiato solo io vince la mia, se solo loro la loro', () => {
  const base = { a: 1, b: 2 };
  assert.deepEqual(u(base, { a: 5, b: 2 }, base), { a: 5, b: 2 });
  assert.deepEqual(u(base, base, { a: 1, b: 9 }), { a: 1, b: 9 });
});

test('campi diversi cambiati da due persone: restano tutti e due', () => {
  assert.deepEqual(u({ a: 1, b: 2 }, { a: 5, b: 2 }, { a: 1, b: 9 }), { a: 5, b: 9 });
});

test('stesso campo cambiato da tutti e due: vince chi salva adesso', () => {
  assert.deepEqual(u({ a: 1 }, { a: 2 }, { a: 3 }), { a: 2 });
});

test('presenze: il mister segna un allenamento, il direttore ne aggiunge un altro', () => {
  const base = { trainings: [{ id: 't1', date: '2026-09-28', att: {} }] };
  const mio = { trainings: [{ id: 't1', date: '2026-09-28', att: { p1: 'P' } }] };
  const loro = { trainings: [{ id: 't1', date: '2026-09-28', att: {} }, { id: 't2', date: '2026-09-30', att: {} }] };
  assert.deepEqual(u(base, mio, loro), { trainings: [{ id: 't1', date: '2026-09-28', att: { p1: 'P' } }, { id: 't2', date: '2026-09-30', att: {} }] });
});

test('stessa partita, presenze di giocatori diversi: si sommano', () => {
  const base = { games: [{ id: 'g1', pl: {} }] };
  const mio = { games: [{ id: 'g1', pl: { a: { pres: true } } }] };
  const loro = { games: [{ id: 'g1', pl: { b: { pres: true } } }] };
  assert.deepEqual(u(base, mio, loro), { games: [{ id: 'g1', pl: { a: { pres: true }, b: { pres: true } } }] });
});

test('voce tolta da una parte e non toccata dall\'altra: resta tolta', () => {
  const base = { players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }] };
  const mio = { players: [{ id: 'p1', name: 'A' }] };                                   // tolgo p2
  const loro = { players: [{ id: 'p1', name: 'A' }, { id: 'p2', name: 'B' }, { id: 'p3', name: 'C' }] };   // aggiungono p3
  assert.deepEqual(u(base, mio, loro).players.map((p) => p.id), ['p1', 'p3']);
});

test('voce tolta da me ma cambiata da loro: resta (non si perde il loro lavoro)', () => {
  const base = { matches: [{ id: 'm1', time: '10:00' }] };
  assert.deepEqual(u(base, { matches: [] }, { matches: [{ id: 'm1', time: '11:00' }] }), { matches: [{ id: 'm1', time: '11:00' }] });
});

test('campo tolto da me e non toccato da loro: resta tolto', () => {
  assert.deepEqual(u({ a: 1, b: 2 }, { a: 1 }, { a: 1, b: 2, c: 3 }), { a: 1, c: 3 });
});

test('elenco nuovo con voci aggiunte da tutti e due: ci sono tutte', () => {
  const r = u({ items: [] }, { items: [{ id: 'x' }] }, { items: [{ id: 'y' }] });
  assert.deepEqual(r.items.map((i) => i.id).sort(), ['x', 'y']);
});

test('senza versione di partenza (base = loro) vince la mia, come prima', () => {
  const loro = { a: 1, b: 2 };
  assert.deepEqual(u(loro, { a: 7 }, loro), { a: 7 });
});
