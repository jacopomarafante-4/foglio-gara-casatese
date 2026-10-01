'use client';
// Squadra → Rosa → "Importa da Excel o CSV" (admin): si sceglie il file, si controllano le colonne (cognome e nome, o nome completo)
// e si vedono i giocatori nuovi (da aggiungere, si possono togliere), quelli già in rosa e quelli in rosa che nel file non ci sono
// (restano: per toglierli c'è "Elimina"). Si aggiungono solo i nuovi, con lo stesso salvataggio dell'elenco incollato.
import { useState } from 'react';
import { ColonneImport } from '@/components/ColonneImport';
import { indovinaColonne, leggiTabella, nomeCompleto, rigaIntestazione, righeMappate, stessoNome, type CampoImport } from '@/lib/import-tabella';

const CAMPI: CampoImport[] = [
  { k: 'cognome', etichetta: 'Cognome', sinonimi: ['cognome', 'surname', 'lastname'] },
  { k: 'nome', etichetta: 'Nome', sinonimi: ['nome', 'name', 'firstname'] },
  { k: 'completo', etichetta: 'Cognome e nome insieme', sinonimi: ['cognomenome', 'nomecognome', 'nominativo', 'giocatore', 'atleta', 'tesserato'] },
];

export function ImportaRosa({ esistenti, onAggiungi }: { esistenti: { name: string }[]; onAggiungi: (nomi: string[]) => void }) {
  const [tab, setTab] = useState<string[][] | null>(null);
  const [intest, setIntest] = useState(0);
  const [colonne, setColonne] = useState<Record<string, number>>({});
  const [togli, setTogli] = useState<Set<string>>(new Set());
  const [errore, setErrore] = useState('');
  const [fatto, setFatto] = useState('');

  async function apri(f: File) {
    setErrore(''); setFatto(''); setTogli(new Set());
    try {
      const t = await leggiTabella(f);
      if (t.length < 2) throw new Error('Il file è vuoto o ha una riga sola.');
      const i = rigaIntestazione(t, CAMPI);
      setTab(t); setIntest(i); setColonne(indovinaColonne(t[i], CAMPI));
    } catch (e) { setErrore((e as Error).message || 'File non leggibile: usa .xlsx o .csv'); setTab(null); }
  }
  const nomi = tab ? [...new Set(righeMappate(tab, intest, colonne).map(nomeCompleto).filter((n) => n.length > 2))] : [];
  const nuovi = nomi.filter((n) => !esistenti.some((g) => stessoNome(g.name, n)));
  const gia = nomi.length - nuovi.length;
  const mancano = esistenti.filter((g) => g.name && !nomi.some((n) => stessoNome(g.name, n)));
  const scelti = nuovi.filter((n) => !togli.has(n));
  const colonneOk = (colonne.cognome ?? -1) >= 0 || (colonne.completo ?? -1) >= 0;

  return (
    <details className="rounded-xl border border-linea bg-white p-3">
      <summary className="cursor-pointer font-semibold">Importa da Excel o CSV</summary>
      <p className="mt-2 text-sm text-grigio">Un file con una riga per giocatore (cognome e nome in due colonne o insieme). Si aggiungono solo i
        giocatori che non sono già in rosa.</p>
      <input type="file" accept=".xlsx,.csv,text/csv" aria-label="File della rosa" className="mt-2 block w-full text-sm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void apri(f); }} />
      {errore && <p role="alert" className="mt-2 rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">{errore}</p>}
      {fatto && <p role="status" className="mt-2 rounded-md bg-verde/10 px-3 py-2 text-sm">{fatto}</p>}
      {tab && (
        <div className="mt-3 space-y-3">
          <ColonneImport intestazione={tab[intest]} campi={CAMPI} colonne={colonne} onChange={setColonne} esempio={tab[intest + 1]} />
          {!colonneOk ? <p className="text-sm text-rosso">Scegli la colonna del cognome (o di cognome e nome insieme).</p> : (
            <>
              <p className="text-sm"><b>{nuovi.length}</b> nuovi · {gia} già in rosa{mancano.length ? ` · ${mancano.length} in rosa ma non nel file (restano)` : ''}</p>
              {nuovi.length > 0 && (
                <ul className="max-h-64 divide-y divide-linea overflow-auto rounded-lg border border-linea text-sm">
                  {nuovi.map((n) => (
                    <li key={n}><label className="flex items-center gap-2 px-3 py-1.5">
                      <input type="checkbox" className="size-5" checked={!togli.has(n)}
                        onChange={(e) => setTogli((s) => { const x = new Set(s); if (e.target.checked) x.delete(n); else x.add(n); return x; })} />{n}
                    </label></li>
                  ))}
                </ul>
              )}
              {mancano.length > 0 && <p className="text-sm text-grigio">Non nel file: {mancano.map((g) => g.name).join(', ')}</p>}
              <button className="bottone" disabled={!scelti.length}
                onClick={() => { onAggiungi(scelti); setFatto(`Aggiunti ${scelti.length} giocatori alla rosa.`); setTab(null); }}>
                Aggiungi {scelti.length} {scelti.length === 1 ? 'giocatore' : 'giocatori'}
              </button>
            </>
          )}
        </div>
      )}
    </details>
  );
}
