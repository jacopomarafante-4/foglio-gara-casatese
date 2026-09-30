// Calci piazzati (lib/piazzati.ts): pedine per la partita, colori, giocatori, doppioni, copia da modello, compiti
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { coloriCompiti, copiaDaModello, doppioni, giocatoreDi, gruppiCompiti, notaDi, numeroLibero, pedine, rinominaCompito, sceltaSchema, schemaNuovo } from '@/lib/piazzati';

const sc = { id: 's1', name: 'Angolo', side: 'favore', note: 'Base', ball: { x: 33, y: 1 },
  tokens: [{ id: 'a', slot: 5, x: 0, y: 5, role: 'Saltatori' }, { id: 'b', slot: 6, x: 2, y: 5, role: 'Saltatori', tag: '1' }, { id: 'c', slot: 9, x: 4, y: 8, role: '' }],
  draw: [{ type: 'arrow', x1: 0, y1: 0, x2: 1, y2: 1 }] };
const rosa = new Set(['p5', 'p6', 'p9', 'px']);
let n = 0; const id = (p) => `${p}${++n}`;

test('pedine per la partita: posizione e compito cambiati solo lì, nota della partita', () => {
  const f = { schemeEdits: { s1: { tokens: { a: { x: 9, y: 9 } }, roles: { b: { role: 'Blocco' } }, note: 'Oggi' } } };
  const p = pedine(sc, f);
  assert.deepEqual([p[0].x, p[0].y, p[1].role, p[1].tag], [9, 9, 'Blocco', '1']);
  assert.equal(notaDi(sc, f), 'Oggi'); assert.equal(notaDi(sc, {}), 'Base');
});

test('colori dei compiti, gruppi (Senza compito in fondo), numero libero', () => {
  const c = coloriCompiti(sc, {});
  assert.equal(c.size, 1); assert.equal(c.get('Saltatori'), '#C8102E');
  assert.deepEqual(gruppiCompiti(sc, {}).map(([k, t]) => [k, t.map((x) => x.slot)]), [['Saltatori', [5, 6]], ['Senza compito', [9]]]);
  assert.equal(numeroLibero(sc), 1);
});

test('chi gioca: scelto a mano per la partita, se no dalla formazione; doppioni', () => {
  const f = { lineup: { 5: 'p5', 6: 'p6', 9: 'p9' }, overrides: { s1: { c: 'p5' } } };
  assert.deepEqual(giocatoreDi(sc, sc.tokens[0], f, rosa), { pid: 'p5', aMano: false });
  assert.deepEqual(giocatoreDi(sc, sc.tokens[2], f, rosa), { pid: 'p5', aMano: true });
  assert.deepEqual(doppioni(sc, f, rosa), [['p5', [5, 9]]]);
  assert.deepEqual(giocatoreDi(sc, sc.tokens[0], { lineup: { 5: 'uscito' } }, rosa), { pid: null, aMano: false });
});

test('usa come modello: copia com\'era per la partita, giocatori scelti e posto tra gli scelti', () => {
  const f = { selected: ['x', 's1'], overrides: { s1: { a: 'px' } }, schemeEdits: { s1: { roles: { c: { role: 'Tiro' } } } } };
  const { copia, selected, overrides } = copiaDaModello(sc, f, id, '2026-09-30', 'Mister');
  assert.equal(copia.da, 's1'); assert.equal(copia.tokens.length, 3); assert.equal(copia.tokens[2].role, 'Tiro');
  assert.deepEqual(selected, ['x', copia.id]);
  assert.deepEqual(overrides[copia.id], { [copia.tokens[0].id]: 'px' });
  assert.notEqual(copia.tokens[0].id, 'a');
});

test('scelta per la partita nell\'ordine dell\'elenco; schema nuovo con 11 pedine', () => {
  assert.deepEqual(sceltaSchema(['c'], 'a', ['a', 'b', 'c']), ['a', 'c']);
  assert.deepEqual(sceltaSchema(['a', 'c'], 'a', ['a', 'b', 'c']), ['c']);
  const s = schemaNuovo('angolo-sfavore', id);
  assert.equal(s.tokens.length, 11); assert.equal(s.side, 'sfavore'); assert.deepEqual(s.ball, { x: 33.3, y: 0.7 });
});

test('rinomina un compito: nello schema, o solo per la partita (e tornando al nome la modifica sparisce)', () => {
  const r1 = rinominaCompito(sc, {}, 'Saltatori', 'Testa', true);
  assert.deepEqual(r1.schema.tokens.map((t) => t.role), ['Testa', 'Testa', '']);
  const r2 = rinominaCompito(sc, {}, 'Saltatori', 'Testa', false);
  assert.deepEqual(r2.modifica.roles, { a: { role: 'Testa' }, b: { role: 'Testa' } });
  const r3 = rinominaCompito(sc, { schemeEdits: { s1: r2.modifica } }, 'Testa', 'Saltatori', false);
  assert.deepEqual(r3.modifica.roles, {});
});
