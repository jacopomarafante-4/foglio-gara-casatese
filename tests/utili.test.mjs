// Testi e date (lib/utili.ts): confronti senza accenti e spazi, nomi con le maiuscole giuste, ora italiana con l'ora legale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizza, maiuscoleIniziali, istanteItaliano, distanzaKm, leggiCoordinate } from '@/lib/utili';

test('normalizza: accenti, apostrofi, spazi e maiuscole non contano', () => {
  assert.equal(normalizza('Vibe Ronchese'), normalizza('viberonchese'));
  assert.equal(normalizza("D'Angèlo"), 'dangelo');
});

test('nomi con le iniziali maiuscole (come nel database, 0021)', () => {
  assert.equal(maiuscoleIniziali("d'angelo"), "D'Angelo");
  assert.equal(maiuscoleIniziali('MARIA ELENA de luca'), 'Maria Elena De Luca');
  assert.equal(maiuscoleIniziali(null), null);
});

test("ora italiana: l'ora legale finisce l'ultima domenica di ottobre", () => {
  assert.equal(istanteItaliano('2026-10-24', '10:00'), '2026-10-24T08:00:00.000Z');
  assert.equal(istanteItaliano('2026-10-25', '10:00'), '2026-10-25T09:00:00.000Z');
  assert.equal(istanteItaliano('data sbagliata', '10:00'), null);
});

test('distanze tra campi', () => {
  const merate = leggiCoordinate('45.6977,9.4201'), cernusco = leggiCoordinate('45.695808,9.397728');
  assert.ok(merate && cernusco);
  const km = distanzaKm(merate, cernusco);
  assert.ok(km > 1 && km < 3, `Merate–Cernusco circa 2 km, non ${km}`);
});
