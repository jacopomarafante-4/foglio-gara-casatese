// Dashboard delle statistiche (lib/statistiche.ts): TAR, TMR, assenze per motivo, andamento, minuti e coppie
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashboard, SIGLE } from '@/lib/statistiche';

const giocatori = [{ id: 'a', name: 'Rossi' }, { id: 'b', name: 'Bianchi' }, { id: 'c', name: 'Verdi' }];
const reg = {
  gk: ['c'],
  trainings: [
    { id: 't1', date: '2026-09-02', att: { a: 'P', b: 'A', c: 'INF' } },
    { id: 't2', date: '2026-09-09', att: { a: 'P', b: 'P', c: 'P' } },
    { id: 't3', date: '2026-10-07', att: { a: 'P', b: 'MAL', c: 'P' } },
    { id: 't4', date: '2026-10-08', att: {} },
  ],
  games: [
    { id: 'g1', date: '2026-09-13', pl: { a: { min: 70, g: 2 }, b: { min: 30 }, c: { min: 70, gc: 1, gk: true } } },
    { id: 'g2', date: '2026-10-11', pl: { a: { min: 40 }, c: { min: 70, gc: 0, gk: true } } },
    { id: 'g3', date: '2026-10-18', pl: {} },   // non giocata: non conta
  ],
};

test('TAR esclude gli infortuni, TMR = allenamenti / partite giocate', () => {
  const d = dashboard(reg, giocatori, [], 'all');
  // presenze 6 (a×3, b×1, c×2), assenze contate 2 (b: A, MAL); INF di c esclusa
  assert.equal(d.tar, 6 / 8);
  assert.equal(d.allenamenti, 4);
  assert.equal(d.partite, 2);
  assert.equal(d.tmr, 2);
});

test('periodo: solo il mese scelto', () => {
  const d = dashboard(reg, giocatori, [], '2026-09');
  assert.equal(d.allenamenti, 2);
  assert.equal(d.partite, 1);
  assert.equal(d.tar, 4 / 5);
});

test('assenze per motivo e andamento seduta per seduta', () => {
  const d = dashboard(reg, giocatori, [], 'all');
  const n = Object.fromEntries(d.assenze.map((x) => [x.k, x.n]));
  assert.equal(n.A, 1); assert.equal(n.MAL, 1); assert.equal(n.INF, 1); assert.equal(n.SCU, 0);
  assert.deepEqual(d.andamento.map((x) => x.pct), [1 / 2, 1, 2 / 3, null]);
});

test('minuti per giocatore e coppie (minuti = il minore dei due, partite insieme)', () => {
  const d = dashboard(reg, giocatori, [], 'all');
  assert.deepEqual(d.minuti.map((x) => [x.p.id, x.min, x.partite]), [['a', 110, 2], ['b', 30, 1], ['c', 140, 2]]);
  assert.deepEqual(d.coppie.a.c, { min: 70 + 40, insieme: 2 });
  assert.deepEqual(d.coppie.a.b, { min: 30, insieme: 1 });
  assert.deepEqual(d.coppie.b.a, d.coppie.a.b);
  assert.equal(d.coppie.b.c.insieme, 1);
  assert.equal(d.conMinuti, true);
  assert.deepEqual(d.risultati, { noti: 2, v: 1, n: 1, p: 0 });
});

test('attività di base: presenze senza minuti contano come partite insieme', () => {
  const adb = { games: [{ id: 'x', date: '2026-10-04', pl: { a: { pres: true }, b: { pres: true } } }] };
  const d = dashboard(adb, giocatori, [], 'all');
  assert.equal(d.conMinuti, false);
  assert.deepEqual(d.coppie.a.b, { min: 0, insieme: 1 });
  assert.equal(d.tar, null);
});

test('ogni sigla ha nome e spiegazione', () => {
  for (const [k, s] of Object.entries(SIGLE)) assert.ok(s.nome && s.spiegazione.length > 20, k);
});
