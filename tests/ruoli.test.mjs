// Regole dei ruoli (lib/ruoli.ts): squadre assegnate a un direttore (0053), Segreteria (0055)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { filtraSquadreDirettore, gestisceSegreteria } from '@/lib/ruoli';

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

test('gestisceSegreteria (0055): admin e segreteria sempre, direttore solo con vedeSegreteria', () => {
  assert.equal(gestisceSegreteria({ ruolo: 'admin', vedeSegreteria: false }), true);
  assert.equal(gestisceSegreteria({ ruolo: 'segreteria', vedeSegreteria: false }), true);
  assert.equal(gestisceSegreteria({ ruolo: 'direttore', vedeSegreteria: true }), true);
  assert.equal(gestisceSegreteria({ ruolo: 'direttore', vedeSegreteria: false }), false);
  assert.equal(gestisceSegreteria({ ruolo: 'scout', vedeSegreteria: true }), false);
  assert.equal(gestisceSegreteria(null), false);
});
