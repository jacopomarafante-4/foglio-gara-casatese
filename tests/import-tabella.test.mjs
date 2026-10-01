// Importazione di rose e anagrafica da Excel/CSV (lib/import-tabella.ts): colonne, nomi, abbinamento alle rose, dati puliti
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CAMPI_ANAGRAFICA, abbinaAnagrafica, datiDaRiga, indovinaColonne, nomeCompleto, rigaIntestazione, righeMappate, stessoNome, unisciDati } from '@/lib/import-tabella';

const tab = [
  ['Esportazione tesserati 2026/27'],
  ['Cognome', 'Nome', 'Data di nascita', 'Nome genitore', 'Cellulare', 'E-mail', 'Scadenza certificato', 'Taglia'],
  ['ROSSI', 'mario', '12/03/2012', 'Anna Bianchi', '+39 333 123 4567', 'Anna@Esempio.IT ', '30/06/2027', 'm'],
  ['Verdi', 'Luca', '2012-05-01', '', '333', 'non-email', '', ''],
  ['Nessuno', 'Qui', '', '', '', '', '', ''],
];
test('riga delle intestazioni sotto un titolo e colonne indovinate', () => {
  const i = rigaIntestazione(tab, CAMPI_ANAGRAFICA);
  assert.equal(i, 1);
  const c = indovinaColonne(tab[i], CAMPI_ANAGRAFICA);
  assert.deepEqual([c.cognome, c.nome, c.nascita, c.genitore1_nome, c.genitore1_tel, c.genitore1_email, c.certificato_scadenza, c.taglia_divisa, c.completo, c.genitore2_nome],
    [0, 1, 2, 3, 4, 5, 6, 7, -1, -1]);
});
test('nomi: "Cognome Nome" con le maiuscole giuste, in qualsiasi ordine', () => {
  assert.equal(nomeCompleto({ cognome: 'DE LUCA', nome: "maria  elena" }), 'De Luca Maria Elena');
  assert.equal(nomeCompleto({ completo: "d'angelo luca" }), "D'Angelo Luca");
  assert.ok(stessoNome('Rossi Mario', 'MARIO ROSSI'));
  assert.ok(stessoNome('Èrba Ugo', 'Erba Ugo'));
  assert.ok(!stessoNome('Rossi Mario', 'Rossi Marco'));
});
test('dati puliti: telefono, email, date, taglie; quelli sbagliati non passano', () => {
  const righe = righeMappate(tab, 1, indovinaColonne(tab[1], CAMPI_ANAGRAFICA));
  assert.deepEqual(datiDaRiga(righe[0]), { genitore1_nome: 'Anna Bianchi', genitore1_tel: '+393331234567', genitore1_email: 'anna@esempio.it', certificato_scadenza: '2027-06-30', taglia_divisa: 'M' });
  assert.deepEqual(datiDaRiga(righe[1]), {});
});
test('abbinamento alle rose: stesso nome anche in due squadre, la data di nascita sceglie tra omonimi, righe senza giocatore', () => {
  const squadre = [
    { id: 't_u18', players: [{ id: 'p1', name: 'Rossi Mario' }] },
    { id: 't_u19', players: [{ id: 'p1', name: 'Rossi Mario' }, { id: 'p2', name: 'Verdi Luca' }] },
    { id: 't_u14', players: [{ id: 'p9', name: 'Verdi Luca' }] },
  ];
  const righe = righeMappate(tab, 1, indovinaColonne(tab[1], CAMPI_ANAGRAFICA));
  const { abbinate, nonTrovate } = abbinaAnagrafica(righe, squadre, { 't_u14|p9': '2014-02-02' });
  assert.deepEqual(abbinate.map((a) => [a.nome, a.nascita, a.giocatori.map((g) => g.squadra)]),
    [['Rossi Mario', '2012-03-12', ['t_u18', 't_u19']], ['Verdi Luca', '2012-05-01', ['t_u19']]]);
  assert.deepEqual(nonTrovate.map((x) => x.nome), ['Nessuno Qui']);
});
test('unione: i vuoti del file non cancellano, senza "sovrascrivi" si riempie solo dove manca', () => {
  const prima = { genitore1_nome: 'Già scritto', taglia_tuta: null, quote: [{ rata: '1' }] };
  assert.deepEqual(unisciDati(prima, { genitore1_nome: 'Nuovo', taglia_tuta: 'L' }, false), { genitore1_nome: 'Già scritto', taglia_tuta: 'L', quote: [{ rata: '1' }] });
  assert.deepEqual(unisciDati(prima, { genitore1_nome: 'Nuovo' }, true).genitore1_nome, 'Nuovo');
});
