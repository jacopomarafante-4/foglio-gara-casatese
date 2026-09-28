// Regola delle 3 valutazioni (lib/valutazioni.ts, come valutatori_distinti nel database, 0040): contano le persone diverse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { valutatori, firma, SOGLIA_VALUTAZIONI } from '@/lib/valutazioni';

const staff = (id, data) => ({ data, autore_id: id, autore_squadra: null, autore: { nome: 'Nome', cognome: id, email: `${id}@x.it` } });
const mister = (squadra, data) => ({ data, autore_id: null, autore_squadra: squadra, autore: null });

test('la stessa persona che valuta tre volte vale una', () => {
  assert.equal(valutatori([staff('a', '2026-09-01'), staff('a', '2026-09-10'), staff('a', '2026-09-20')]).length, 1);
});

test('tre persone diverse raggiungono la soglia', () => {
  const v = [staff('a', '2026-09-01'), mister('Rossi · Under 14', '2026-09-10'), staff('b', '2026-09-20')];
  assert.equal(SOGLIA_VALUTAZIONI, 3);
  assert.equal(valutatori(v).length, 3);
  assert.equal(valutatori(v)[0].chiave, 'b', 'la più recente per prima');
});

test('mister riconoscibili; account rimosso contato come persona', () => {
  assert.equal(firma(mister('Rossi · Under 14', '2026-09-01')).mister, true);
  const rimosso = { data: '2026-09-01', autore_id: 'z', autore_squadra: null, autore: null };
  assert.equal(firma(rimosso).chiave, 'z');
  assert.equal(valutatori([rimosso, { ...rimosso, data: '2026-09-02' }]).length, 1);
});

test('valutazioni storiche senza autore contano una per una (come nel database)', () => {
  const ignoto = (data) => ({ data, autore_id: null, autore_squadra: null, autore: null });
  assert.equal(valutatori([ignoto('2026-01-01'), ignoto('2026-02-01')]).length, 2);
});
