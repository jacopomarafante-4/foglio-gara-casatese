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

import { applicaModifiche } from '@/lib/modifiche';
test('modifiche voce per voce: le altre voci e il resto del documento restano', () => {
  const base = { matches: [{ id: 'a', opponent: 'Lecco' }, { id: 'b', opponent: 'Como' }], altro: 1 };
  const r = applicaModifiche(base, [
    { lista: 'matches', id: 'b', voce: { id: 'b', opponent: 'Monza' } },
    { lista: 'matches', id: 'c', voce: { id: 'c', opponent: 'Erba' } },
    { lista: 'matches', id: 'a', voce: null },
  ]);
  assert.deepEqual(r.matches.map((m) => m.opponent), ['Monza', 'Erba']);
  assert.equal(r.altro, 1);
  assert.equal(base.matches.length, 2, 'il documento di partenza non cambia');
  assert.deepEqual(applicaModifiche(null, [{ lista: 'items', id: 'x', voce: { id: 'x' } }]), { items: [{ id: 'x' }] });
});

import { corsie, durataPartita, statoPortiere, daGiocare } from '@/lib/calendario-portale';
test('vista Giorno: partite accavallate affiancate, durata indicativa per età', () => {
  const r = corsie([{ m: {}, inizio: 600, fine: 690 }, { m: {}, inizio: 630, fine: 720 }, { m: {}, inizio: 800, fine: 860 }]);
  assert.deepEqual(r.map((e) => [e.corsia, e.corsie]), [[0, 2], [1, 2], [0, 1]]);
  assert.equal(durataPartita({ team: { category: 'Under 10' } }), 60);
  assert.equal(durataPartita({ team: { category: 'Under 12' } }), 75);
  assert.equal(durataPartita({ team: { category: 'Under 17' } }), 90);
  assert.equal(durataPartita({ evento: {}, time: '15:00', fine: '18:30' }), 210);
  assert.equal(daGiocare({ date: '2026-01-01' }, '2026-02-01'), false);
  assert.equal(daGiocare({}, '2026-02-01'), true);
});
test('preparatori: stato del portiere dalla convocazione giusta', () => {
  const m = { id: 'c1', date: '2026-10-04', opponent: 'Lecco' };
  assert.equal(statoPortiere({ date: '2026-10-04', opponent: 'lecco ', callup: { p1: 'CON', p2: 'INF' } }, m, 'p2'), 'INF');
  assert.equal(statoPortiere({ adb: { partite: [{ calId: 'c1', conv: ['p1'] }] } }, m, 'p1'), 'CON');
  assert.equal(statoPortiere({ adb: { partite: [{ calId: 'c1', conv: ['p1'] }] } }, m, 'p3'), 'NC');
  assert.equal(statoPortiere({ date: '2026-10-11', callup: { p1: 'CON' } }, m, 'p1'), '');
});

import { riepilogo, daFare, risultato, presenzaDi } from '@/lib/registro';
test('registro: presenze senza gli infortuni, risultato dai gol, cose da fare', () => {
  const reg = {
    trainings: [{ id: 't1', date: '2026-09-01', att: { a: 'P', b: 'INF' } }, { id: 't2', date: '2026-09-03', att: { a: 'A', b: 'P' } }, { id: 't3', date: '2026-09-05', att: { a: 'G' } }],
    games: [{ id: 'g1', calId: 'c1', pl: { a: { min: 70, g: 2 }, b: { min: 70, gc: 1 } } }, { id: 'g2', calId: 'c2', pl: { a: { min: 30 } } }],
    gk: ['b'],
  };
  const cal = [{ id: 'c1', date: '2026-09-06', opponent: 'Lecco' }, { id: 'c2', date: '2026-09-13', opponent: 'Como' }, { id: 'c3', date: '2026-09-20', opponent: 'Erba' }];
  assert.equal(presenzaDi(reg.trainings[2], 'a'), 'FAM');
  assert.deepEqual(risultato(reg.games[0], reg.gk), { gf: 2, ga: 1 });
  assert.equal(risultato(reg.games[1], reg.gk), null);
  const r = riepilogo(reg, [{ id: 'a' }, { id: 'b' }], cal);
  assert.equal(r.nT, 3); assert.equal(r.nG, 2); assert.equal(r.v, 1); assert.equal(r.nNoti, 1);
  assert.equal(r.mediaPresenze, (1 / 3 + 1) / 2, 'a: 1 su 3; b: 1 su 1 (infortunio escluso)');
  const f = daFare(reg, cal, '2026-09-25', false, true);
  assert.deepEqual(f.map((x) => x.tipo), ['assenze', 'tabellino', 'gol']);
  assert.equal(f[1].calId, 'c3');
});

import { leggiTempo, statisticheAllenamento, presenzePerMese } from '@/lib/registro';
test('allenamento: tempi dei test, statistiche e presenze per mese', () => {
  assert.equal(leggiTempo('12:51'), 771); assert.equal(leggiTempo("12'5"), 770); assert.equal(leggiTempo('12'), 720);
  assert.equal(leggiTempo('12:75'), null); assert.equal(leggiTempo('differenziato'), null);
  const reg = { trainings: [
    { id: 'a', date: '2026-09-01', att: { x: 'P', y: 'INF' } }, { id: 'b', date: '2026-09-03', att: { x: 'MAL', y: 'P' } },
    { id: 'c', date: '2026-10-01', att: { x: 'P', y: 'A' } }] };
  const g = [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }];
  const s = statisticheAllenamento(reg, g, 'all');
  assert.equal(s.righe[0].pct, 2 / 3); assert.equal(s.righe[1].pct, 1 / 2); assert.equal(s.infortuni, 1); assert.equal(s.assenze, 3);
  assert.equal(statisticheAllenamento(reg, g, '2026-10').tr.length, 1);
  const m = presenzePerMese(reg, g);
  assert.deepEqual(m.mesi, ['2026-09', '2026-10']); assert.deepEqual(m.per.y['2026-09'], { P: 1, tot: 1 });
});

import { statistichePartite, colonnePartite, riepilogoTempi } from '@/lib/registro';
import { leggiCoordinate, campoPerRicerca, linkCampo } from '@/lib/campi';
test('partite: statistiche, colonne dei tabellini, tempi e campi', () => {
  const cal = [{ id: 'c1', date: '2026-09-06', opponent: 'Lecco' }, { id: 'c2', date: '2026-09-20', opponent: 'Como' }, { id: 'c3', date: '2026-09-27', opponent: 'Erba' }];
  const reg = { gk: ['b'], games: [{ id: 'g1', calId: 'c1', dur: 70, pl: { a: { min: 70, g: 1 }, b: { min: 70, gc: 0 } } }, { id: 'g9', date: '2026-08-30', opponent: 'Amica', pl: {} }] };
  const s = statistichePartite(reg, [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], cal, 'all');
  assert.equal(s.gm.length, 1); assert.equal(s.v, 1); assert.equal(s.inviolata, 1);
  assert.equal(s.righe[0].pctMin, 1); assert.equal(s.righe[1].inPorta, 1);
  const col = colonnePartite(reg, cal, '2026-09-10');
  assert.deepEqual(col.map((c) => c.cal?.id ?? c.gara.id), ['g9', 'c1', 'c2'], 'giocate + la prossima + fuori calendario');
  assert.deepEqual(riepilogoTempi([{ noi: 2, loro: 1 }, { noi: 0, loro: 0 }, { noi: 1, loro: 3 }]), { v: 1, pa: 1, pe: 1, noi: 3, loro: 4 });
  assert.equal(leggiCoordinate('https://maps.google.com/?q=45.69,9.40'), '45.690000,9.400000');
  assert.equal(campoPerRicerca('C.S. Comunale Campo 2 - Cernusco Lombardone (LC)'), 'Centro Sportivo Comunale, Cernusco Lombardone');
  assert.match(linkCampo({ 'campo x': { ll: '45.1,9.2' } }, 'Campo X'), /destination=45\.1,9\.2/);
});
