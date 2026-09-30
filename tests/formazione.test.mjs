// Formazione (lib/formazione.ts): numeri di maglia, ordine delle posizioni, metti, togli, panchina
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { metti, numeroMaglia, ordinePosizioni, panchina, posizione, primaLibera, togli, titolari } from '@/lib/formazione';

test('ordine delle posizioni: portiere, difesa, centrocampo, attacco, ognuno da destra', () => {
  assert.deepEqual(ordinePosizioni('1-4-4-2'), [1, 2, 5, 6, 3, 7, 8, 4, 11, 9, 10]);
  assert.deepEqual(ordinePosizioni('1-4-3-3').slice(0, 5), [1, 2, 5, 6, 3]);
  assert.equal(ordinePosizioni().length, 11);
});

test('numeri di maglia: posizione in campo, panchina da 12', () => {
  const f = { lineup: { 1: 'a', 9: 'b' }, bench: ['c', 'd'] };
  assert.equal(numeroMaglia(f, 'b'), 9); assert.equal(numeroMaglia(f, 'd'), 13); assert.equal(numeroMaglia(f, 'z'), null);
});

test('metti, togli, prima libera, panchina', () => {
  let f = { formation: '1-4-4-2', lineup: {}, bench: ['a'] };
  assert.equal(primaLibera(f), 1);
  f = { ...f, ...metti(f, 1, 'a') };
  assert.deepEqual(f.lineup, { 1: 'a' }); assert.deepEqual(f.bench, []);
  assert.equal(primaLibera(f), 2);
  f = { ...f, ...metti(f, 5, 'a') };              // si sposta: la 1 si libera
  assert.deepEqual(f.lineup, { 5: 'a' });
  f = { ...f, ...panchina(f, 'a') };              // in panchina: esce dal campo
  assert.deepEqual(f.lineup, {}); assert.deepEqual(f.bench, ['a']);
  f = { ...f, ...panchina(f, 'a') };              // di nuovo: esce dalla panchina
  assert.deepEqual(f.bench, []);
  f = { ...f, ...metti(f, 9, 'b') }; f = { ...f, ...togli(f, 9) };
  assert.deepEqual(f.lineup, {});
});

test('posizioni spostate a mano e titolari nell\'ordine del modulo', () => {
  assert.deepEqual(posizione({ slotPos: { 9: { x: 40, y: 20 } } }, 9, 62, 22), { x: 40, y: 20 });
  assert.deepEqual(posizione({}, 9, 62, 22), { x: 62, y: 22 });
  const t = titolari({ formation: '1-4-4-2', lineup: { 1: 'a' } });
  assert.equal(t.length, 11); assert.deepEqual(t[0], { slot: 1, pid: 'a' }); assert.equal(t[1].pid, null);
});
