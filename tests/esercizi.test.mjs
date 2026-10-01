// Esercitazioni (lib/esercizi.ts): Area per Giocatore e fascia, durata, filtri
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { areaPerGiocatore, durataTotale, esercizioVuoto, fasciaApP, filtra } from '@/lib/esercizi';

test('Area per Giocatore: campo / giocatori, jolly 0,5 e portieri 0,3', () => {
  assert.equal(areaPerGiocatore({ lunghezza: 35, larghezza: 25, movimento: 8, jolly: 2, portieri: 0 }), 97);   // 875 / 9
  assert.equal(areaPerGiocatore({ lunghezza: 40, larghezza: 30, movimento: 10, jolly: 0, portieri: 2 }), 113);   // 1200 / 10,6
  assert.equal(areaPerGiocatore({ lunghezza: 0, larghezza: 30, movimento: 10 }), null);
  assert.equal(fasciaApP(60).k, 'altissima'); assert.equal(fasciaApP(100).k, 'media'); assert.equal(fasciaApP(200).k, 'ampia'); assert.equal(fasciaApP(300).k, 'massima');
  assert.equal(fasciaApP(null), null);
});
test('durata: serie per minuti più i recuperi tra le serie', () => {
  assert.equal(durataTotale({ serie: 4, minuti: 4, recupero: 1 }), 19);
  assert.equal(durataTotale({ minuti: 15 }), 15);
  assert.equal(durataTotale({ serie: 3 }), null);
});
test('esercizio nuovo e filtri', () => {
  let n = 0; const e = esercizioVuoto((p) => p + n++);
  assert.equal(e.lavagna.elementi.length, 9);
  const lista = [{ ...e, id: '1', titolo: 'Rondo 4+2', tipo: 'rondo', categorie: ['Under 14'], morfociclo: 'MD-4' }, { ...e, id: '2', titolo: 'Partita 8c8', tipo: 'lsg', categorie: ['Under 17'] }];
  assert.deepEqual(filtra(lista, { tipo: 'rondo' }).map((x) => x.id), ['1']);
  assert.deepEqual(filtra(lista, { categoria: 'Under 17' }).map((x) => x.id), ['2']);
  assert.deepEqual(filtra(lista, { q: 'partita' }).map((x) => x.id), ['2']);
  assert.deepEqual(filtra(lista, { md: 'MD-4' }).map((x) => x.id), ['1']);
});
