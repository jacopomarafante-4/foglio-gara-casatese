// Ricerca dei doppioni (lib/doppioni.ts): prudente, deve trovare i refusi ma non unire persone diverse.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { distanza, motivoDoppione, trovaDoppioni, chiaveCoppia } from '@/lib/doppioni';

const g = (id, cognome, nome, annata) => ({ id, cognome, nome, annata, descrizione: null, societa_id: null });

test('distanza tra due nomi (lettere da cambiare)', () => {
  assert.equal(distanza('rossi', 'rossi'), 0);
  assert.equal(distanza('rossi', 'rosi'), 1);
  assert.equal(distanza('bianchi', 'bianco'), 2);
});

test('stesse persone scritte in modi diversi', () => {
  assert.ok(motivoDoppione(g('1', 'Rossi', 'Luca', 2013), g('2', 'Rossi', 'Luca', 2013)));
  assert.ok(motivoDoppione(g('1', 'Rossi', 'Luca', 2013), g('2', 'Rosi', 'Luca', 2013)), 'refuso');
});

test('persone diverse restano separate', () => {
  assert.equal(motivoDoppione(g('1', 'Rossi', 'Luca', 2013), g('2', 'Rossi', 'Luca', 2011)), null, 'annate lontane');
  assert.equal(motivoDoppione(g('1', 'Rossi', 'Luca', 2013), g('2', 'Bianchi', 'Marco', 2013)), null);
});

test('le coppie già segnate come persone diverse non tornano', () => {
  const a = g('1', 'Rossi', 'Luca', 2013), b = g('2', 'Rossi', 'Luca', 2013);
  assert.equal(trovaDoppioni([a, b], new Set()).length, 1);
  assert.equal(trovaDoppioni([a, b], new Set([chiaveCoppia('1', '2')])).length, 0);
  assert.equal(chiaveCoppia('1', '2'), chiaveCoppia('2', '1'));
});
