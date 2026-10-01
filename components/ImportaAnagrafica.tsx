'use client';
// Segreteria → "Importa anagrafica da Excel o CSV" (es. l'esportazione di Golee): si sceglie il file, si controllano le colonne, si
// vede a chi va ogni riga (giocatori delle rose con lo stesso nome, anche in più squadre) e quali righe non trovano nessuno. Si
// salvano data di nascita, genitori, scadenza del certificato e taglie: di norma solo dove manca, con la spunta anche sopra i dati
// già scritti. Scrive direttamente nelle tabelle protette (RLS: admin, direttori, segreteria).
import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ColonneImport } from '@/components/ColonneImport';
import { CAMPI_ANAGRAFICA, abbinaAnagrafica, indovinaColonne, leggiTabella, rigaIntestazione, righeMappate, unisciDati } from '@/lib/import-tabella';
import type { SquadraRosa, Tesserato } from '@/components/Tesserati';

type Riga = { id: string; squadra_id: string; giocatore_id: string; nome_completo: string; data_nascita: string | null; dati: Record<string, unknown> };

export function ImportaAnagrafica({ squadre, lista, onImportati }: { squadre: SquadraRosa[]; lista: Riga[]; onImportati: (t: Tesserato[]) => void }) {
  const [supabase] = useState(createClient);
  const [tab, setTab] = useState<string[][] | null>(null);
  const [intest, setIntest] = useState(0);
  const [colonne, setColonne] = useState<Record<string, number>>({});
  const [sovrascrivi, setSovrascrivi] = useState(false);
  const [stato, setStato] = useState('');
  const [errore, setErrore] = useState('');

  async function apri(f: File) {
    setErrore(''); setStato('');
    try {
      const t = await leggiTabella(f);
      if (t.length < 2) throw new Error('Il file è vuoto o ha una riga sola.');
      const i = rigaIntestazione(t, CAMPI_ANAGRAFICA);
      setTab(t); setIntest(i); setColonne(indovinaColonne(t[i], CAMPI_ANAGRAFICA));
    } catch (e) { setErrore((e as Error).message || 'File non leggibile: usa .xlsx o .csv'); setTab(null); }
  }
  const nascite = Object.fromEntries(lista.filter((t) => t.data_nascita).map((t) => [`${t.squadra_id}|${t.giocatore_id}`, t.data_nascita!]));
  const { abbinate, nonTrovate } = tab ? abbinaAnagrafica(righeMappate(tab, intest, colonne), squadre, nascite) : { abbinate: [], nonTrovate: [] };
  const colonneOk = (colonne.cognome ?? -1) >= 0 || (colonne.completo ?? -1) >= 0;
  const nomeSquadra = (id: string) => { const s = squadre.find((x) => x.id === id); return s?.category || s?.name || id; };
  const posti = abbinate.reduce((a, x) => a + x.giocatori.length, 0);

  async function importa() {
    setErrore(''); setStato('Salvo…');
    try {
      // 1. il tesserato di ogni giocatore abbinato (si crea se manca)
      const manca = abbinate.flatMap((a) => a.giocatori).filter((g) => !lista.some((t) => t.squadra_id === g.squadra && t.giocatore_id === g.id));
      const unici = [...new Map(manca.map((g) => [`${g.squadra}|${g.id}`, g])).values()];
      let tutti: Riga[] = lista;
      if (unici.length) {
        const { data, error } = await supabase.from('tesserati').insert(unici.map((g) => ({ squadra_id: g.squadra, giocatore_id: g.id, nome_completo: g.name })))
          .select('id, squadra_id, giocatore_id, nome_completo, data_nascita');
        if (error) throw new Error(error.message);
        tutti = [...lista, ...(data ?? []).map((t) => ({ ...t, dati: {} }))];
      }
      // 2. data di nascita e dati della segreteria
      const nascitaRighe: { id: string; data_nascita: string; squadra_id: string; giocatore_id: string; nome_completo: string; updated_at: string }[] = [];
      const datiRighe: Record<string, unknown>[] = [];
      const ora = new Date().toISOString();
      for (const a of abbinate) for (const g of a.giocatori) {
        const t = tutti.find((x) => x.squadra_id === g.squadra && x.giocatore_id === g.id);
        if (!t) continue;
        if (a.nascita && (sovrascrivi || !t.data_nascita)) nascitaRighe.push({ id: t.id, data_nascita: a.nascita, squadra_id: t.squadra_id, giocatore_id: t.giocatore_id, nome_completo: t.nome_completo, updated_at: ora });
        const prima = (t.dati ?? {}) as Record<string, unknown>, dopo = unisciDati(prima, a.dati, sovrascrivi);
        if (JSON.stringify(dopo) !== JSON.stringify(prima)) {
          const { tesserato_id: _x, ...resto } = dopo as Record<string, unknown> & { tesserato_id?: string }; void _x;
          datiRighe.push({ ...resto, tesserato_id: t.id, updated_at: ora });
        }
      }
      if (nascitaRighe.length) { const { error } = await supabase.from('tesserati').upsert(nascitaRighe); if (error) throw new Error(error.message); }
      if (datiRighe.length) { const { error } = await supabase.from('tesserati_dati').upsert(datiRighe); if (error) throw new Error(error.message); }
      // 3. la lista della pagina si aggiorna
      const ids = [...new Set([...nascitaRighe.map((r) => r.id), ...datiRighe.map((r) => r.tesserato_id as string), ...tutti.filter((t) => !lista.includes(t)).map((t) => t.id)])];
      if (ids.length) {
        const { data } = await supabase.from('tesserati').select('*, tesserati_dati(*)').in('id', ids);
        onImportati((data ?? []) as Tesserato[]);
      }
      setStato(`Anagrafica importata: ${nascitaRighe.length} date di nascita e ${datiRighe.length} schede aggiornate${nonTrovate.length ? `, ${nonTrovate.length} righe senza giocatore` : ''}.`);
      setTab(null);
    } catch (e) { setStato(''); setErrore('Non importata: ' + ((e as Error).message || 'riprova')); }
  }

  return (
    <details className="rounded-xl border border-linea bg-white p-3">
      <summary className="cursor-pointer font-semibold">Importa anagrafica da Excel o CSV</summary>
      <p className="mt-2 text-sm text-grigio">Un file con una riga per ragazzo (es. l&apos;esportazione di Golee). Ogni riga va al giocatore della rosa con lo
        stesso nome; si salvano data di nascita, genitori, scadenza del certificato e taglie.</p>
      <input type="file" accept=".xlsx,.csv,text/csv" aria-label="File dell'anagrafica" className="mt-2 block w-full text-sm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void apri(f); }} />
      {errore && <p role="alert" className="mt-2 rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">{errore}</p>}
      {stato && <p role="status" className="mt-2 rounded-md bg-verde/10 px-3 py-2 text-sm">{stato}</p>}
      {tab && (
        <div className="mt-3 space-y-3">
          <ColonneImport intestazione={tab[intest]} campi={CAMPI_ANAGRAFICA} colonne={colonne} onChange={setColonne} esempio={tab[intest + 1]} />
          {!colonneOk ? <p className="text-sm text-rosso">Scegli la colonna del cognome (o di cognome e nome insieme).</p> : (
            <>
              <p className="text-sm"><b>{abbinate.length}</b> righe abbinate ({posti} {posti === 1 ? 'giocatore' : 'giocatori'} nelle rose) · <b>{nonTrovate.length}</b> senza giocatore</p>
              {abbinate.length > 0 && (
                <ul className="max-h-64 divide-y divide-linea overflow-auto rounded-lg border border-linea text-sm">
                  {abbinate.map((a) => (
                    <li key={a.riga} className="px-3 py-1.5"><b>{a.nome}</b> → {a.giocatori.map((g) => nomeSquadra(g.squadra)).join(', ')}
                      <span className="text-grigio"> · {[a.nascita && 'nascita', ...Object.keys(a.dati).map((k) => k.replace('_', ' '))].filter(Boolean).join(', ') || 'nessun dato'}</span></li>
                  ))}
                </ul>
              )}
              {nonTrovate.length > 0 && (
                <details className="text-sm"><summary className="cursor-pointer font-semibold">Righe senza giocatore nelle rose ({nonTrovate.length})</summary>
                  <p className="mt-1 text-grigio">{nonTrovate.map((x) => x.nome).join(', ')}. Controlla come è scritto il nome nella rosa (Squadra → Rosa).</p></details>
              )}
              <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="size-5" checked={sovrascrivi} onChange={(e) => setSovrascrivi(e.target.checked)} />
                Scrivi anche sopra i dati già presenti (se no si riempiono solo i campi vuoti)</label>
              <button className="bottone" disabled={!abbinate.length || stato === 'Salvo…'} onClick={importa}>Importa {abbinate.length} righe</button>
            </>
          )}
        </div>
      )}
    </details>
  );
}
