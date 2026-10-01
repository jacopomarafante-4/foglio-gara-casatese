// Ripristino da un backup (lib/ripristino.ts): lettura del file e confronto scheda per scheda
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { confronta, leggiBackup, nomeScheda } from '@/lib/ripristino';

const squadre = [{ id: 't_u15', category: 'Under 15 - Provinciale' }];
test('file di backup: si tengono solo le schede del Portale', () => {
  const b = leggiBackup(JSON.stringify({ exportedAt: '2026-09-30T10:00:00Z', docs: { 'roster/t_u15': { players: [] }, 'altro/x': {}, 'shared/teams': { items: [] }, 'roster/../x': {} } }));
  assert.deepEqual(Object.keys(b.docs).sort(), ['roster/t_u15', 'shared/teams']);
  assert.throws(() => leggiBackup('non json'), /non è un file di backup/i);
  assert.throws(() => leggiBackup('{"a":1}'), /docs/);
});
test('confronto: uguale anche con le chiavi in altro ordine, diverso con i conteggi, mancante', () => {
  const backup = { docs: {
    'roster/t_u15': { players: [{ id: 'a', name: 'X' }, { id: 'b', name: 'Y' }] },
    'calendar/t_u15': { matches: [], extra: { b: 1, a: 2 } },
    'registro/t_u15': { trainings: [{ id: 't' }] },
  } };
  const oggi = { 'roster/t_u15': { players: [{ id: 'a', name: 'X' }] }, 'calendar/t_u15': { extra: { a: 2, b: 1 }, matches: [] } };
  assert.deepEqual(confronta(backup, oggi, squadre), [
    { path: 'calendar/t_u15', nome: 'Calendario · Under 15 - Provinciale', stato: 'uguale', dettaglio: '' },
    { path: 'registro/t_u15', nome: 'Registro (presenze, tabellini, schemi) · Under 15 - Provinciale', stato: 'manca', dettaglio: "oggi non c'è" },
    { path: 'roster/t_u15', nome: 'Rosa · Under 15 - Provinciale', stato: 'diverso', dettaglio: 'giocatori: 1 oggi, 2 nel backup' },
  ]);
  assert.equal(nomeScheda('shared/teams', squadre), 'Società: squadre e PIN');
});
