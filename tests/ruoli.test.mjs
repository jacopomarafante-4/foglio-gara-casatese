// Regole dei ruoli (lib/ruoli.ts): squadre assegnate a un direttore (0053)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtraSquadreDirettore } from '@/lib/ruoli';

const lista = [{ id: 't_u14' }, { id: 't_u15' }, { id: 't_u16' }];

test('direttore con squadre = null: vede tutte (come prima)', () => {
  assert.deepEqual(filtraSquadreDirettore({ ruolo: 'direttore', squadre: null }, lista), lista);
});
test('direttore con squadre scelte: solo quelle', () => {
  assert.deepEqual(filtraSquadreDirettore({ ruolo: 'direttore', squadre: ['t_u15'] }, lista), [{ id: 't_u15' }]);
});
test('direttore senza squadre (solo Segreteria): nessuna', () => {
  assert.deepEqual(filtraSquadreDirettore({ ruolo: 'direttore', squadre: [] }, lista), []);
});
test('admin e altri ruoli: mai filtrati, anche con una colonna squadre valorizzata per errore', () => {
  assert.deepEqual(filtraSquadreDirettore({ ruolo: 'admin', squadre: [] }, lista), lista);
  assert.deepEqual(filtraSquadreDirettore(null, lista), lista);
});
