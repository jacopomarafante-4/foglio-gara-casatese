// Import dei calendari da file (lib/import-calendario.ts, lib/xlsx.ts): ICS, CSV, Excel. Dati inventati.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { daTabella, leggiCsv, leggiData, leggiIcs, leggiOra, leggiTitolo, senzaContatti } from '@/lib/import-calendario';
import { leggiXlsx } from '@/lib/xlsx';

test('titoli: categoria dall’annata o da "U14"/"Under 14", avversario, tipo', () => {
  assert.deepEqual(leggiTitolo('U14 - 2013 - Lecco', '2026-10-12'), { eta: 14, avversario: 'Lecco', tipo: 'Amichevole' });
  assert.deepEqual(leggiTitolo('AdB - 2016 - Torneo di Natale', '2026-12-20'), { eta: 11, avversario: 'Torneo di Natale', tipo: 'Torneo' });
  assert.deepEqual(leggiTitolo('Under 15 vs Merate', '2027-03-01'), { eta: 15, avversario: 'Merate', tipo: 'Amichevole' });
  assert.equal(leggiTitolo('Riunione genitori', '2026-10-01').tipo, 'Evento');
  assert.equal(leggiTitolo('U14 - 2013 - Allenamento', '2026-10-01').eta, null);
  // a gennaio la stagione è ancora quella che finisce quell'anno
  assert.equal(leggiTitolo('2013 - Olginatese', '2027-01-15').eta, 14);
});

test('ICS: righe spezzate, ora in UTC tradotta, eventi ripetuti e annullati scartati, niente contatti nelle note', () => {
  const ics = ['BEGIN:VCALENDAR', 'BEGIN:VEVENT', 'UID:abc@google.com', 'SUMMARY:U14 - 2013 - Lec', ' co', 'DTSTART:20261012T083000Z',
    'DTEND:20261012T100000Z', 'LOCATION:Campo\\, Lecco', 'DESCRIPTION:Arbitro nostro\\nReferente Rossi 333 1234567', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:rip', 'SUMMARY:Allenamento U14', 'DTSTART;TZID=Europe/Rome:20261013T170000', 'RRULE:FREQ=WEEKLY', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:via', 'SUMMARY:U15 - 2012 - X', 'DTSTART;VALUE=DATE:20261020', 'STATUS:CANCELLED', 'END:VEVENT',
    'BEGIN:VEVENT', 'UID:festa', 'SUMMARY:Festa di Natale', 'DTSTART;VALUE=DATE:20261219', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
  const r = leggiIcs(ics);
  assert.equal(r.length, 2);
  assert.deepEqual({ ...r[0] }, { chiave: 'ics:abc@google.com', data: '2026-10-12', ora: '10:30', fine: '12:00', titolo: 'U14 - 2013 - Lecco',
    avversario: 'Lecco', eta: 14, casa: null, campo: 'Campo, Lecco', note: 'Arbitro nostro', tipo: 'Amichevole' });
  assert.equal(r[1].tipo, 'Evento'); assert.equal(r[1].ora, '');
  assert.equal(leggiIcs(ics, '2026-11-01').length, 1);   // solo da una data in poi
});

test('date e ore scritte in tanti modi', () => {
  assert.equal(leggiData('12/10/2026'), '2026-10-12'); assert.equal(leggiData('1-2-27'), '2027-02-01');
  assert.equal(leggiData('2026-10-12'), '2026-10-12'); assert.equal(leggiData('46307'), '2026-10-12'); assert.equal(leggiData('boh'), '');
  assert.equal(leggiOra('9.30'), '09:30'); assert.equal(leggiOra('10:30'), '10:30'); assert.equal(leggiOra('0.4375'), '10:30'); assert.equal(leggiOra(''), '');
});

test('CSV con ";" e virgolette; colonne riconosciute dal nome', () => {
  const t = leggiCsv('﻿Data;Ora;Categoria;Avversario;Casa/Trasferta;Note\r\n12/10/2026;10.30;Under 14;"Lecco; B";casa;tel 333 1234567\r\n;;;;;\r\n13/10/2026;;;Allenamento;;\r\n');
  const r = daTabella(t);
  assert.equal(r.length, 1);
  assert.equal(r[0].eta, 14); assert.equal(r[0].avversario, 'Lecco; B'); assert.equal(r[0].casa, true); assert.equal(r[0].ora, '10:30'); assert.equal(r[0].note, '');
  assert.deepEqual(leggiCsv('a,b\n1,"x ""y"""'), [['a', 'b'], ['1', 'x "y"']]);
});

test('Excel: primo foglio, testi condivisi e in linea, date e ore di Excel, annata come squadra', async () => {
  const tab = await leggiXlsx(new Uint8Array(readFileSync('tests/dati/calendario-prova.xlsx')));
  assert.deepEqual(tab[0], ['Data', 'Ora', 'Squadra', 'Avversario', 'Casa', 'Campo']);
  const r = daTabella(tab);
  assert.equal(r.length, 2);
  assert.deepEqual([r[0].data, r[0].ora, r[0].eta, r[0].avversario, r[0].casa], ['2026-10-12', '10:30', 14, 'Lecco & Co', true]);
  assert.deepEqual([r[1].data, r[1].eta, r[1].tipo, r[1].casa, r[1].campo], ['2026-12-20', 13, 'Torneo', false, 'C.S. Rossi']);
});

test('contatti tolti dalle note', () => {
  assert.equal(senzaContatti('Ritrovo 9.30\nmario@x.it\nContattare Luca'), 'Ritrovo 9.30');
});
