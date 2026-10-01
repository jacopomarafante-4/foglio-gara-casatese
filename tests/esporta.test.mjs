// Esportazioni in Excel (lib/esporta.ts): contenuto dei fogli
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fogliAllenamento, fogliCalendario, fogliPartite, fogliRosa, nomeFile } from '@/lib/esporta';

const giocatori = [{ id: 'b', name: 'Verdi Luca' }, { id: 'a', name: 'Bianchi Marco' }];
const reg = {
  gk: ['a'],
  trainings: [{ id: 't1', date: '2026-09-02', att: { a: 'P', b: 'MAL' } }, { id: 't2', date: '2026-09-04', att: { a: 'P', b: 'P' } }],
  games: [{ id: 'g1', date: '2026-09-13', opponent: 'Lecco', home: true, comp: 'Campionato', pl: { a: { min: 70, gc: 1 }, b: { min: 35, g: 2 } } }],
};

test('nome del file senza accenti né spazi', () => {
  assert.equal(nomeFile('Rosa', 'Under 16 - Regionale Élite', '2026-10-01'), 'Rosa_Under_16_-_Regionale_Elite_2026-10-01.xlsx');
});
test('rosa in ordine alfabetico con ruolo e numero', () => {
  assert.deepEqual(fogliRosa([{ id: 'b', name: 'Verdi Luca', ruolo: 'attaccante', numero: '9' }, { id: 'a', name: 'Bianchi Marco', ruolo: 'portiere', numero: '' }])[0].righe,
    [['Giocatore', 'Ruolo', 'N. partita'], ['Bianchi Marco', 'portiere', ''], ['Verdi Luca', 'attaccante', 9]]);
});
test('allenamenti: riepilogo e giorno per giorno', () => {
  const [riep, giorni] = fogliAllenamento(reg, giocatori, 'all');
  assert.deepEqual(riep.righe[1], ['Bianchi Marco', 2, 0, 0, 0, 0, 0, 0, 0, 100]);
  assert.deepEqual(riep.righe[2], ['Verdi Luca', 1, 1, 0, 0, 0, 0, 0, 1, 50]);
  assert.deepEqual(giorni.righe, [['Giocatore', '02/09/2026', '04/09/2026'], ['Bianchi Marco', 'P', 'P'], ['Verdi Luca', 'MAL', 'P']]);
});
test('partite: risultato, statistiche e minuti', () => {
  const [partite, gioc, minuti] = fogliPartite(reg, giocatori, [], 'all');
  assert.deepEqual(partite.righe[1], ['13/09/2026', 'Lecco', 'Casa', 'Campionato', 2, 1, 'V']);
  assert.deepEqual(gioc.righe[1], ['Bianchi Marco', 1, 70, 100, 70, 0, 1, 1]);
  assert.deepEqual(minuti.righe[2], ['Verdi Luca', '35 (2 gol)']);
});
test('calendario in ordine di data, campionato e amichevoli', () => {
  const f = fogliCalendario([{ id: '2', date: '2026-09-20', time: '10:00', opponent: 'Osnago', home: false, friendly: true },
    { id: '1', date: '2026-09-13', time: '15:00', opponent: 'Lecco', home: true, venue: 'C.S. Merate', stato: 'confermata' }]);
  assert.deepEqual(f[0].righe.slice(1), [['13/09/2026', '15:00', 'Lecco', 'Casa', 'Campionato', 'C.S. Merate', '', 'Confermata'],
    ['20/09/2026', '10:00', 'Osnago', 'Trasferta', 'Amichevole', '', '', '']]);
});
