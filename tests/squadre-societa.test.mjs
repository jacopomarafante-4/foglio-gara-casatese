// Società → Squadre (lib/squadre-societa.ts): operazioni su shared/teams
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applicaOpSquadre, conMister, leggiEta, pinUsati, senzaSpazi } from '@/lib/squadre-societa';

const base = () => [
  { id: 't_u14', name: 'Academy', category: 'Under 14', code: '1111', coaches: [{ id: 'm1', name: 'Rossi', code: '2222' }] },
  { id: 't_u15', name: 'Academy', category: 'Under 15', coach: 'Bianchi, Verdi' },
];
const pinFisso = (usati) => { assert.ok(!usati.has('3333')); return '3333'; };

test('le squadre vecchie col solo testo "coach" diventano elenco di mister senza PIN', () => {
  assert.deepEqual(conMister(base()[1]).coaches, [{ id: 'm0', name: 'Bianchi', code: '' }, { id: 'm1', name: 'Verdi', code: '' }]);
});

test('PIN usati: di squadra e dei mister', () => {
  assert.deepEqual([...pinUsati(base().map(conMister))].sort(), ['1111', '2222']);
});

test('aggiungi ed elimina una squadra', () => {
  const s = applicaOpSquadre(base(), { tipo: 'aggiungiSquadra', id: 't_nuova' }, pinFisso);
  assert.equal(s.length, 3); assert.equal(s[2].name, 'Nuova squadra'); assert.deepEqual(s[2].coaches, []);
  assert.equal(applicaOpSquadre(base(), { tipo: 'aggiungiSquadra', id: 't_u14' }, pinFisso), null);
  assert.deepEqual(applicaOpSquadre(base(), { tipo: 'eliminaSquadra', id: 't_u14' }, pinFisso).map((t) => t.id), ['t_u15']);
});

test('mister: aggiungi, nome (con il riassunto "coach"), PIN nuovo, togli', () => {
  let s = applicaOpSquadre(base(), { tipo: 'aggiungiMister', id: 't_u14', mister: 'm_x' }, pinFisso);
  s = applicaOpSquadre(s, senzaSpazi({ tipo: 'nomeMister', id: 't_u14', mister: 'm_x', valore: ' Neri  ' }), pinFisso);
  assert.equal(s[0].coach, 'Rossi, Neri');
  s = applicaOpSquadre(s, { tipo: 'pinMister', id: 't_u14', mister: 'm_x' }, pinFisso);
  assert.equal(s[0].coaches[1].code, '3333');
  s = applicaOpSquadre(s, { tipo: 'togliMister', id: 't_u14', mister: 'm1' }, pinFisso);
  assert.deepEqual(s[0].coaches.map((c) => c.id), ['m_x']); assert.equal(s[0].coach, 'Neri');
});

test('non tocca le altre squadre né il documento di partenza', () => {
  const b = base();
  const s = applicaOpSquadre(b, { tipo: 'campo', id: 't_u15', campo: 'category', valore: 'Under 16' }, pinFisso);
  assert.equal(s[1].category, 'Under 16'); assert.equal(b[1].category, 'Under 15'); assert.equal(s[0], s[0]);
  assert.equal(b[0].coaches.length, 1);
});

test('squadre speciali, PIN di squadra, categorie dei portieri', () => {
  let s = applicaOpSquadre(base(), { tipo: 'flag', id: 't_u14', flag: 'vedeTutte', valore: true }, pinFisso);
  assert.equal(s[0].vedeTutte, true);
  s = applicaOpSquadre(s, { tipo: 'flag', id: 't_u14', flag: 'vedeTutte', valore: false }, pinFisso);
  assert.ok(!('vedeTutte' in s[0]));
  s = applicaOpSquadre(s, { tipo: 'disattivaPinSquadra', id: 't_u14' }, pinFisso);
  assert.ok(!('code' in s[0]));
  s = applicaOpSquadre(s, { tipo: 'etaMister', id: 't_u14', mister: 'm1', valore: '15, 14 e 15, 11' }, pinFisso);
  assert.deepEqual(s[0].coaches[0].eta, [15, 14, 11]);
  assert.deepEqual(leggiEta(''), []);
});

test('squadra o mister che non ci sono più: niente da salvare', () => {
  assert.equal(applicaOpSquadre(base(), { tipo: 'nomeMister', id: 't_u14', mister: 'm9', valore: 'X' }, pinFisso), null);
  assert.equal(applicaOpSquadre(base(), { tipo: 'campo', id: 't_zz', campo: 'name', valore: 'X' }, pinFisso), null);
});

test('mentre si scrive gli spazi restano, al salvataggio si tolgono', () => {
  const op = { tipo: 'campo', id: 't_u14', campo: 'category', valore: 'Under ' };
  assert.equal(applicaOpSquadre(base(), op, pinFisso)[0].category, 'Under ');
  assert.equal(senzaSpazi({ ...op, valore: '  Under   15 ' }).valore, 'Under 15');
  assert.deepEqual(senzaSpazi({ tipo: 'eliminaSquadra', id: 'x' }), { tipo: 'eliminaSquadra', id: 'x' });
});
