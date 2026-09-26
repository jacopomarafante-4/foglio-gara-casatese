'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { etaDaCategoria, fineStagione } from '@/lib/categorie';
import { RUOLI_CAMPO } from '@/lib/tipi';
import { Etichetta } from '@/components/Etichetta';
import { salvaPartita } from './actions';

const CATEGORIE = ['Under 19', 'Under 17', 'Under 16', 'Under 15', 'Under 14', 'Esordienti', 'Pulcini'];
const nuovaRiga = () => ({ id: Math.random().toString(36).slice(2) });

/** Annata proposta dalla categoria ("Under 14" → 2013 nella stagione 2026/27) */
function annataDa(categoria: string) {
  const e = etaDaCategoria(categoria);
  return e ? String(fineStagione() - e.min) : '';
}

/** Aggiungi partita: gara, distinte (foto o PDF) e segnalazioni, tutto in una volta */
export function NuovaPartita({ societa, oggi }: { societa: string[]; oggi: string }) {
  const router = useRouter();
  const [righe, setRighe] = useState([nuovaRiga()]);
  const [categoria, setCategoria] = useState('');
  const [casa, setCasa] = useState('');
  const [trasferta, setTrasferta] = useState('');
  const [file, setFile] = useState<File[]>([]);
  const [stato, setStato] = useState<{ lavoro?: string; errore?: string }>({});
  const inputFile = useRef<HTMLInputElement>(null);
  const annata = annataDa(categoria);

  async function invia(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStato({ lavoro: 'Salvo la partita…' });
    const r = await salvaPartita(new FormData(e.currentTarget));
    if (r.errore || !r.garaId) { setStato({ errore: r.errore ?? 'Partita non salvata.' }); return; }

    // Distinte: nel contenitore privato "distinte", cartella della gara
    let caricate = 0;
    const falliti: string[] = [];
    if (file.length) {
      const supabase = createClient();
      for (const [i, f] of file.entries()) {
        setStato({ lavoro: `Carico la distinta ${i + 1} di ${file.length}…` });
        const nome = f.name.normalize('NFD').replace(/[^\w.-]+/g, '_').slice(-80);
        const percorso = `${r.garaId}/${Date.now()}-${i}-${nome}`;
        const up = await supabase.storage.from('distinte').upload(percorso, f, { contentType: f.type || undefined });
        const ins = up.error ? up : await supabase.from('gare_allegati').insert({ gara_id: r.garaId, percorso, nome_file: f.name, tipo: f.type });
        if (ins.error) falliti.push(f.name); else caricate++;
      }
    }
    const msg = [r.messaggio, caricate ? `${caricate} ${caricate === 1 ? 'distinta caricata' : 'distinte caricate'}.` : '',
      falliti.length ? `Non caricate: ${falliti.join(', ')}.` : ''].filter(Boolean).join(' ');
    router.push(`/gare?ok=${encodeURIComponent(msg)}`);
  }

  const inLavoro = !!stato.lavoro && !stato.errore;
  return (
    <form onSubmit={invia} className="space-y-8">
      <datalist id="elenco-societa">{societa.map((s) => <option key={s} value={s} />)}</datalist>

      {/* 1. La partita */}
      <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">La partita</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <Etichetta testo="Data *"><input type="date" name="data" required defaultValue={oggi} className="campo" /></Etichetta>
          <Etichetta testo="Ora"><input type="time" name="ora" className="campo" /></Etichetta>
          <Etichetta testo="Categoria *">
            <input name="categoria" list="elenco-categorie" required value={categoria} onChange={(e) => setCategoria(e.target.value)}
              placeholder="Es. Under 14" className="campo" autoComplete="off" />
            <datalist id="elenco-categorie">{CATEGORIE.map((c) => <option key={c} value={c} />)}</datalist>
          </Etichetta>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Etichetta testo="Squadra di casa *">
            <input name="casa" list="elenco-societa" required value={casa} onChange={(e) => setCasa(e.target.value)} className="campo" autoComplete="off" />
          </Etichetta>
          <Etichetta testo="Squadra ospite *">
            <input name="trasferta" list="elenco-societa" required value={trasferta} onChange={(e) => setTrasferta(e.target.value)} className="campo" autoComplete="off" />
          </Etichetta>
        </div>
        <Etichetta testo="Campo" aiuto="Facoltativo: se lo lasci vuoto vale il campo della squadra di casa.">
          <input name="campo" className="campo" placeholder="Es. C.S. Comunale - Merate" />
        </Etichetta>
        <p className="text-sm text-grigio">Se la partita è già nei calendari, si usa quella: niente doppioni.</p>
      </section>

      {/* 2. Distinte */}
      <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Distinte</h2>
        <p className="text-sm text-grigio">
          Foto o PDF, anche più di una. Restano private: le vedono solo admin, direttori e chi le carica.
        </p>
        <input ref={inputFile} type="file" accept="image/*,application/pdf" multiple className="hidden"
          onChange={(e) => { setFile((x) => [...x, ...Array.from(e.target.files ?? [])]); e.target.value = ''; }} />
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => inputFile.current?.click()} className="rounded-lg border border-blu px-4 py-2.5 font-semibold text-blu hover:bg-blu/5">
            + Foto o PDF della distinta
          </button>
          {file.map((f, i) => (
            <span key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-full bg-carta px-3 py-1.5 text-sm">
              📎 {f.name.length > 28 ? `${f.name.slice(0, 25)}…` : f.name}
              <button type="button" aria-label={`Togli ${f.name}`} onClick={() => setFile((x) => x.filter((_, j) => j !== i))} className="text-grigio hover:text-rosso">×</button>
            </span>
          ))}
        </div>
      </section>

      {/* 3. Segnalazioni */}
      <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Giocatori visti</h2>
        <p className="text-sm text-grigio">
          Una riga per giocatore. Basta il numero di maglia se non sai il nome. Se è già in archivio, la segnalazione va sulla sua scheda.
        </p>
        {righe.map((r, i) => (
          <div key={r.id} className="space-y-2 rounded-lg border border-linea p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-grigio">Giocatore {i + 1}</span>
              {righe.length > 1 && (
                <button type="button" onClick={() => setRighe((x) => x.filter((y) => y.id !== r.id))} className="text-sm text-grigio hover:text-rosso">Togli</button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6">
              <select name="s_squadra" className="campo col-span-2" aria-label="Squadra">
                <option value="casa">{casa || 'Squadra di casa'}</option>
                <option value="trasferta">{trasferta || 'Squadra ospite'}</option>
              </select>
              <input name="s_numero" inputMode="numeric" placeholder="N. maglia" aria-label="Numero di maglia" className="campo" />
              <input name="s_cognome" placeholder="Cognome" aria-label="Cognome" className="campo" />
              <input name="s_nome" placeholder="Nome" aria-label="Nome" className="campo" />
              <input name="s_annata" inputMode="numeric" defaultValue={annata} key={annata} placeholder="Annata" aria-label="Annata" className="campo" />
              <select name="s_ruolo" className="campo col-span-2 sm:col-span-2" aria-label="Ruolo">
                <option value="">Ruolo</option>
                {Object.entries(RUOLI_CAMPO).map(([v, e]) => <option key={v} value={v}>{e}</option>)}
              </select>
              <select name="s_voto" className="campo col-span-2 sm:col-span-1" aria-label="Voto">
                <option value="">Voto</option>
                {[1, 2, 3, 4, 5].map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
              <textarea name="s_testo" rows={2} placeholder="Cosa hai visto" aria-label="Cosa hai visto" className="campo col-span-2 sm:col-span-3" />
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setRighe((x) => [...x, nuovaRiga()])} className="rounded-lg border border-blu px-4 py-2.5 font-semibold text-blu hover:bg-blu/5">
          + Aggiungi giocatore
        </button>
      </section>

      {stato.errore && <p role="alert" className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">{stato.errore}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={inLavoro} className="bottone">{inLavoro ? stato.lavoro : 'Salva partita'}</button>
        <a href="/gare" className="rounded-lg px-4 py-3 text-sm font-medium text-grigio hover:bg-carta">Annulla</a>
      </div>
    </form>
  );
}
