// Scrittura dei file Excel (lib/xlsx-scrivi.ts): si rilegge il file con lib/xlsx.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaXlsx } from '@/lib/xlsx-scrivi';
import { leggiXlsx } from '@/lib/xlsx';

test('Excel scritto e riletto: testi, numeri, caratteri speciali, celle vuote', async () => {
  const righe = [['Giocatore', 'Presenze', 'Note'], ['Rossi Mario', 12, 'ok & "bene" <sì>'], ["D'Angelo Luca", 0, null], ['Èrba Ugo', 3.5, '']];
  const f = creaXlsx([{ nome: 'Presenze', righe }, { nome: 'Altro/foglio', righe: [['x']] }]);
  assert.equal(String.fromCharCode(f[0], f[1]), 'PK');
  const letto = await leggiXlsx(f);
  assert.deepEqual(letto.slice(0, 4).map((r) => [0, 1, 2].map((i) => r[i] ?? '')), [['Giocatore', 'Presenze', 'Note'], ['Rossi Mario', '12', 'ok & "bene" <sì>'], ["D'Angelo Luca", '0', ''], ['Èrba Ugo', '3.5', '']]);
});
