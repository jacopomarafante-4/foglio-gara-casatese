// Home (lib/home.ts): presenze per mese, risultati e marcatori, risposte delle famiglie, giorni mancanti
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { contaRisposte, presenzePerMeseSquadra, risultati, saluto, stagioneSquadra, traQuanto } from '@/lib/home';

const giocatori = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
const reg = {
  gk: ['c'],
  trainings: [
    { id: 't1', date: '2026-08-20', att: { a: 'P', b: 'A', c: 'INF' } },
    { id: 't2', date: '2026-09-02', att: { a: 'P', b: 'P', c: 'P' } },
    { id: 't3', date: '2026-09-09', att: { a: 'P', b: 'MAL', c: 'P' } },
  ],
  games: [
    { id: 'g1', date: '2026-09-13', opponent: 'Lecco', home: true, pl: { a: { min: 70, g: 2 }, b: { min: 70, g: 1 }, c: { min: 70, gc: 1 } } },
    { id: 'g2', calId: 'k2', date: '2026-09-19', opponent: 'Dubino', home: false, pl: { a: { min: 70 }, c: { min: 70, gc: 0 } } },
    { id: 'g3', date: '2026-09-26', opponent: 'Senza dati', pl: {} },
  ],
};
const cal = [{ id: 'k2', date: '2026-09-20', opponent: 'Dubino' }];

test('presenze mese per mese, infortuni esclusi', () => {
  assert.deepEqual(presenzePerMeseSquadra(reg, giocatori), [{ mese: '2026-08', pct: 0.5 }, { mese: '2026-09', pct: 5 / 6 }]);
  assert.deepEqual(presenzePerMeseSquadra({}, giocatori), []);
});

test('risultati: solo partite giocate col risultato, dalla più recente, data del calendario, marcatori per gol', () => {
  const r = risultati(reg, cal);
  assert.deepEqual(r.map((x) => [x.data, x.avversario, x.gf, x.ga]), [['2026-09-20', 'Dubino', 0, 0], ['2026-09-13', 'Lecco', 3, 1]]);
  assert.deepEqual(r[1].marcatori, [{ id: 'a', gol: 2 }, { id: 'b', gol: 1 }]);
});

test('risposte delle famiglie per la partita (id del calendario o data|avversario)', () => {
  const risposte = { 'a|k9': { risposta: 'si' }, 'b|k9': { risposta: 'no' }, 'c|2026-10-04|Lecco': { risposta: 'si' }, 'x|k9': { risposta: 'si' } };
  assert.deepEqual(contaRisposte(risposte, giocatori, { id: 'k9' }), { si: 1, no: 1 });
  assert.deepEqual(contaRisposte(risposte, giocatori, { date: '2026-10-04', opponent: 'Lecco' }), { si: 1, no: 0 });
});

test('giorni mancanti e saluto', () => {
  assert.equal(traQuanto('2026-09-30', '2026-10-04'), 'tra 4 giorni');
  assert.equal(traQuanto('2026-09-30', '2026-10-01'), 'domani');
  assert.equal(traQuanto('2026-09-30', '2026-09-30'), 'oggi');
  assert.equal(traQuanto('2026-10-25', '2026-10-27'), 'tra 2 giorni');   // anche a cavallo del cambio d'ora
  assert.equal(saluto(9), 'Buongiorno'); assert.equal(saluto(15), 'Buon pomeriggio'); assert.equal(saluto(21), 'Buonasera');
});

test('stagione di una squadra per la tabella della società', () => {
  const s = stagioneSquadra(reg, giocatori, cal);
  assert.deepEqual([s.giocate, s.v, s.n, s.p, s.gf, s.gs, s.conRisultato], [2, 1, 1, 0, 3, 1, 2]);
});
