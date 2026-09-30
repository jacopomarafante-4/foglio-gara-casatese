'use client';
// Squadra → Allenamento → Test atletici (solo Under 15, come viewTests/testEditor del Portale): elenco dei test e, aperto un test,
// il tempo di ogni giocatore (12:51 = minuti:secondi; qualsiasi altra parola resta come nota). Si salva da solo.
import { useState } from 'react';
import { leggiTempo, tempoPerCampo, type Test } from '@/lib/registro';
import { fmtData } from '@/lib/programma';
import { nuovoId } from '@/lib/calendario-portale';
import { Messaggio, useSalva } from '@/components/calendario/salvataggio';

const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';

export function TestAtletici({ squadraId, giocatori, test, aperto: apertoIniziale, oggi, soloLettura }: {
  squadraId: string; giocatori: { id: string; name: string }[]; test: Test[]; aperto: string | null; oggi: string; soloLettura: boolean;
}) {
  const [elenco, setElenco] = useState(test);
  const [aperto, setAperto] = useState(apertoIniziale);
  /* testo scritto nei campi dei tempi (così "12:" resta mentre si scrive) */
  const [scritti, setScritti] = useState<Record<string, string>>({});
  const { salva, messaggio } = useSalva();
  const path = 'registro/' + squadraId;
  const t = elenco.find((x) => x.id === aperto) ?? null;

  function apri(id: string | null) {
    setAperto(id); setScritti({});
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('test', id); else u.searchParams.delete('test');
    window.history.replaceState(null, '', u);
  }
  function cambia(ts: Test, attesa?: number) {
    setElenco((l) => (l.some((x) => x.id === ts.id) ? l.map((x) => (x.id === ts.id ? ts : x)) : [...l, ts]));
    salva(path, [{ lista: 'tests', id: ts.id, voce: ts }], attesa);
  }
  function tempo(ts: Test, pid: string, testo: string) {
    setScritti((s) => ({ ...s, [pid]: testo }));
    const v = testo.trim(), sec = leggiTempo(v), res = { ...(ts.res ?? {}) };
    if (!v) delete res[pid]; else res[pid] = sec != null ? { s: sec } : { note: v };
    cambia({ ...ts, res });
  }

  if (t) {
    const nomi = [...new Set(['3 km', '2 km', '1 km', ...elenco.map((x) => x.name).filter(Boolean) as string[]])];
    return (
      <div className="space-y-3">
        <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => apri(null)}>← Tutti i test</button>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold text-grigio">Test</span>
            <input className="campo" list="nomitest" placeholder="Es. 3 km" value={t.name ?? ''} readOnly={soloLettura} onChange={(e) => cambia({ ...t, name: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-semibold text-grigio">Data</span>
            <input type="date" className="campo" value={t.date} readOnly={soloLettura} onChange={(e) => e.target.value && cambia({ ...t, date: e.target.value })} /></label>
        </div>
        <datalist id="nomitest">{nomi.map((n) => <option key={n} value={n} />)}</datalist>
        {!soloLettura && (
          <div className="flex justify-end">
            <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={() => {
              if (!confirm(`Eliminare il test "${t.name || 'Test'}" del ${fmtData(t.date)}?`)) return;
              setElenco((l) => l.filter((x) => x.id !== t.id)); salva(path, [{ lista: 'tests', id: t.id, voce: null }], 0); apri(null);
            }}>Elimina test</button>
          </div>
        )}
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
          {giocatori.map((p) => (
            <li key={p.id} className="flex items-center justify-between gap-2 py-2">
              <span className="min-w-0 font-semibold">{p.name}</span>
              <input className="w-40 shrink-0 rounded-lg border border-linea px-2 py-2" placeholder="mm:ss" aria-label={`Tempo ${p.name}`} readOnly={soloLettura}
                value={scritti[p.id] ?? tempoPerCampo(t.res?.[p.id])} onChange={(e) => tempo(t, p.id, e.target.value)} />
            </li>
          ))}
        </ul>
        <Messaggio testo={messaggio} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {!soloLettura && <button className="bottone" onClick={() => { const ts: Test = { id: nuovoId('ts'), date: oggi, name: '', res: {} }; cambia(ts, 0); apri(ts.id); }}>+ Nuovo test</button>}
      <p className="text-grigio">Scrivi i tempi come 12:51 (minuti:secondi). Qualsiasi altra parola (es. “differenziato”, “non svolto”) resta come nota.</p>
      {elenco.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun test registrato.</p> : (
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
          {elenco.slice().sort((a, b) => b.date.localeCompare(a.date)).map((x) => (
            <li key={x.id} className="flex items-center justify-between gap-2 py-2.5">
              <span><b>{x.name || 'Test'}</b> · {fmtData(x.date)}</span>
              <span className="flex items-center gap-2">
                <span className="text-sm text-grigio"><b>{Object.values(x.res ?? {}).filter((r) => r.s != null).length}</b> tempi</span>
                <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => apri(x.id)}>Apri</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
