// Programma gare (lib/programma.ts) e tessera del mister (lib/tessera.ts)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { impegniDelPeriodo, ordineProgramma, settimanaDi, eventoCome, calendario } from '@/lib/programma';
import { creaTessera, leggiTessera } from '@/lib/tessera';

const U14 = { id: 't_u14', category: 'Under 14', matches: [
  { id: 'a', date: '2026-10-04', time: '10:30', opponent: 'Lecco', home: true, venue: 'CAMPO MERATE' },
  { id: 'b', date: '2026-10-11', time: '9:00', opponent: 'Monza', home: false },
] };
const U17 = { id: 't_u17', category: 'Under 17', matches: [{ id: 'c', date: '2026-10-03', time: '15:00', opponent: 'Como', home: true, venue: 'Cernusco' }] };
const festa = { id: 'e1', titolo: 'Festa', tipo: 'Festa', data: '2026-10-04', inizio: '18:00', luogo: 'merate', squadre: [] };
const riunione = { id: 'e2', titolo: 'Riunione U17', data: '2026-10-04', luogo: 'altro', indirizzo: 'Sede', squadre: ['t_u17'] };

test('settimana proposta: da lunedì a domenica', () => {
  assert.deepEqual(settimanaDi('2026-09-30'), { dal: '2026-09-28', al: '2026-10-04' });
  assert.deepEqual(settimanaDi('2026-10-04'), { dal: '2026-09-28', al: '2026-10-04' });
});

test('solo il periodo, in ordine di giorno e ora', () => {
  const r = impegniDelPeriodo([U14, U17], [festa], '2026-09-28', '2026-10-04', []);
  assert.deepEqual(r.map((m) => m.id), ['c', 'a', 'ev_e1']);
});

test('squadre scelte: gli eventi di tutta la società restano, quelli di altre squadre no', () => {
  const r = impegniDelPeriodo([U14, U17], [festa, riunione], '2026-09-28', '2026-10-04', ['t_u14']);
  assert.deepEqual(r.map((m) => m.id), ['a', 'ev_e1']);
});

test('PDF: prima le categorie più grandi, gli eventi in fondo', () => {
  const r = impegniDelPeriodo([U14, U17], [festa], '2026-09-28', '2026-10-04', []).sort(ordineProgramma);
  assert.deepEqual(r.map((m) => m.id), ['c', 'a', 'ev_e1']);
});

test('calendario: Merate dal campo, evento altrove = Trasferta', () => {
  assert.equal(calendario({ ...U14.matches[0] }), 'merate');
  assert.equal(calendario({ ...U17.matches[0] }), 'cernusco');
  assert.equal(calendario(eventoCome(riunione)), 'trasferta');
});

test('tessera: si legge solo con la stessa chiave e non è in chiaro', async () => {
  const prima = process.env.SEGRETO_SESSIONE;
  process.env.SEGRETO_SESSIONE = 'x'.repeat(40);
  const v = await creaTessera('123456');
  assert.ok(v && !v.includes('123456'));
  assert.equal((await leggiTessera(v)).pin, '123456');
  assert.equal(await leggiTessera(v.slice(0, -2) + (v.endsWith('A') ? 'BB' : 'AA')), null);   // alterata
  process.env.SEGRETO_SESSIONE = 'y'.repeat(40);
  assert.equal(await leggiTessera(v), null);   // altra chiave
  process.env.SEGRETO_SESSIONE = '';
  assert.equal(await creaTessera('123456'), null);   // senza chiave: niente tessera
  process.env.SEGRETO_SESSIONE = prima;
});
