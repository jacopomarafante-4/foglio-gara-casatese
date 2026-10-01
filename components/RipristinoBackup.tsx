'use client';
// Società → Backup → "Ripristina da un backup" (solo admin): si sceglie il file scaricato con "Esporta backup", si vede scheda per
// scheda cosa è diverso da oggi (lib/ripristino.ts), si scelgono le schede e si rimettono come nel backup. Le versioni di oggi
// restano nello Storico modifiche: anche un ripristino si può annullare.
import { useState } from 'react';
import { confrontaBackup, ripristinaBackup } from '@/app/(aree)/docs-actions';
import type { Confronto } from '@/lib/ripristino';

export function RipristinoBackup() {
  const [file, setFile] = useState<File | null>(null);
  const [schede, setSchede] = useState<Confronto[] | null>(null);
  const [quando, setQuando] = useState('');
  const [scelte, setScelte] = useState<Set<string>>(new Set());
  const [stato, setStato] = useState('');
  const [errore, setErrore] = useState('');

  async function apri(f: File) {
    setFile(f); setErrore(''); setStato('Confronto il backup con i dati di oggi…'); setScelte(new Set());
    const fd = new FormData(); fd.set('file', f);
    const r = await confrontaBackup(fd).catch(() => ({ ok: false as const, errore: 'rete assente' }));
    setStato('');
    if (!r.ok || !('valore' in r) || !r.valore) { setErrore(r.errore ?? 'Backup non letto.'); setSchede(null); return; }
    setSchede(r.valore.schede);
    setQuando(r.valore.exportedAt ? new Date(r.valore.exportedAt).toLocaleString('it-IT', { timeZone: 'Europe/Rome', dateStyle: 'long', timeStyle: 'short' }) : '');
  }
  async function ripristina() {
    if (!file || !scelte.size) return;
    if (!confirm(`Rimettere ${scelte.size} ${scelte.size === 1 ? 'scheda' : 'schede'} come nel backup? I dati di oggi restano nello Storico modifiche.`)) return;
    setErrore(''); setStato('Ripristino…');
    const fd = new FormData(); fd.set('file', file); fd.set('schede', JSON.stringify([...scelte]));
    const r = await ripristinaBackup(fd).catch(() => ({ ok: false as const, errore: 'rete assente' }));
    if (!r.ok) { setStato(''); setErrore(`Non ripristinato: ${r.errore ?? 'riprova'}`); return; }
    setStato(`Ripristinate ${'valore' in r ? r.valore : scelte.size} schede.`);
    await apri(file);
    setStato(`Ripristinate ${'valore' in r ? r.valore : ''} schede.`);
  }
  const diverse = (schede ?? []).filter((s) => s.stato !== 'uguale');

  return (
    <details className="mt-3 rounded-lg border border-linea p-3">
      <summary className="cursor-pointer font-semibold">Ripristina da un backup</summary>
      <p className="mt-2 text-sm text-grigio">Scegli un file scaricato con &quot;Esporta backup&quot;: vedi cosa è diverso da oggi e scegli cosa rimettere. I dati di
        oggi restano nello Storico modifiche, quindi si può tornare indietro.</p>
      <input type="file" accept=".json,application/json" aria-label="File di backup" className="mt-2 block w-full text-sm"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void apri(f); }} />
      {errore && <p role="alert" className="mt-2 rounded-md bg-rosso/10 px-3 py-2 text-sm text-rosso">{errore}</p>}
      {stato && <p role="status" className="mt-2 text-sm font-semibold text-blu">{stato}</p>}
      {schede && (
        <div className="mt-3 space-y-2">
          <p className="text-sm">{quando ? `Backup del ${quando}: ` : ''}<b>{schede.length}</b> schede, <b>{diverse.length}</b> diverse da oggi.</p>
          {diverse.length > 0 && (
            <ul className="max-h-72 divide-y divide-linea overflow-auto rounded-lg border border-linea text-sm">
              {diverse.map((s) => (
                <li key={s.path}><label className="flex items-start gap-2 px-3 py-1.5">
                  <input type="checkbox" className="mt-0.5 size-5" checked={scelte.has(s.path)}
                    onChange={(e) => setScelte((x) => { const n = new Set(x); if (e.target.checked) n.add(s.path); else n.delete(s.path); return n; })} />
                  <span><b>{s.nome}</b> <span className="text-grigio">· {s.stato === 'manca' ? 'oggi non c\'è' : s.dettaglio}</span></span>
                </label></li>
              ))}
            </ul>
          )}
          <button className="bottone" disabled={!scelte.size || stato === 'Ripristino…'} onClick={ripristina}>Ripristina {scelte.size || ''} {scelte.size === 1 ? 'scheda' : 'schede'}</button>
        </div>
      )}
    </details>
  );
}
