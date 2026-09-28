// Calendari Google → Portale (lib/calendario-google.ts): il campionato ufficiale non si tocca mai, le amichevoli sì.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applica, titoloPartita, calendarioPartita } from '@/lib/calendario-google';

const U14 = { id: 't_u14', category: 'Under 14 - Provinciale' };
const futura = '2099-05-10';
const daGoogle = (extra = {}) => ({ gcal: 'g1', gcalCal: 'MERATE', eta: 14, ufficiale: false, date: futura, time: '10:00',
  opponent: 'Vibe Ronchese', home: true, location: '', note: '', tipo: 'Amichevole', ...extra });

test("un'amichevole nuova su Google entra nel Portale", () => {
  const r = applica(U14, [], [daGoogle()]);
  assert.equal(r.aggiunte, 1);
  assert.equal(r.matches[0].friendly, true);
  assert.equal(r.matches[0].gcal, 'g1');
  assert.match(r.matches[0].venue, /MERATE/);
});

test("un'annata diversa non entra", () => {
  assert.equal(applica(U14, [], [daGoogle({ eta: 13 })]).aggiunte, 0);
});

test('la partita di campionato già nel calendario ufficiale non viene toccata', () => {
  const campionato = { id: 'c1', garaId: 'gara-9', date: futura, time: '15:00', opponent: 'A.S.D. Vibe Ronchese', home: true };
  const r = applica(U14, [campionato], [daGoogle({ ufficiale: true, time: '18:00' })]);
  assert.equal(r.aggiunte + r.aggiornate, 0);
  assert.equal(r.matches[0].time, '15:00');
});

test('se su Google cambia, nel Portale si aggiorna; se sparisce, si toglie (solo nel futuro)', () => {
  const prima = applica(U14, [], [daGoogle()]).matches;
  const r = applica(U14, prima, [daGoogle({ time: '11:30' })]);
  assert.equal(r.aggiornate, 1);
  assert.equal(r.matches[0].time, '11:30');
  assert.equal(applica(U14, prima, []).tolte, 1);
  const passata = [{ ...prima[0], date: '2020-01-01' }];
  assert.equal(applica(U14, passata, []).tolte, 0, 'le partite giocate restano');
});

test('titoli e calendario su Google', () => {
  assert.match(titoloPartita(U14, { id: 'x', opponent: 'Vibe' }), /^U14 - \d{4} - Vibe$/);
  assert.match(titoloPartita({ id: 't', category: 'Under 10' }, { id: 'x' }), /^AdB - \d{4} - Da trovare$/);
  assert.equal(calendarioPartita({ id: 'x', home: true, venue: 'C.S. COMUNALE - MERATE' }), 'MERATE');
  assert.equal(calendarioPartita({ id: 'x', home: true, venue: 'C.S. COMUNALE - CERNUSCO LOMBARDONE' }), 'CERNUSCO');
  assert.equal(calendarioPartita({ id: 'x', home: false }), 'TRASFERTA');
});
