'use client';
// Squadra → Allenamento → Presenze (come viewTrainings/trainingEditor del Portale). Tabella: una colonna per allenamento
// (la più recente in vista), ✓ presente, lettera = motivo dell'assenza, ✗ motivo da indicare; presenze e % per giocatore
// (gli infortuni non abbassano la %). Toccando una data si apre la scheda: presente/assente, motivo, data, note.
// Squadra dei preparatori dei portieri (`gruppi`): portieri divisi per preparatore; scelto un preparatore si vedono e si segnano
// solo i suoi (un allenamento nuovo li mette presenti, gli altri restano vuoti e non contano).
import { useEffect, useRef, useState } from 'react';
import { MOTIVI, SOGLIA_PRESENZE, assente, pctTesto, percentuale, presenzaDi, type Allenamento } from '@/lib/registro';
import { fmtData, giorno } from '@/lib/programma';
import { nuovoId } from '@/lib/calendario-portale';
import { Messaggio, useSalva } from '@/components/calendario/salvataggio';
import type { GruppoPortieri } from '@/lib/portieri';

type Giocatore = { id: string; name: string; gk: boolean };
const MOTIVO = Object.fromEntries(MOTIVI.map((m) => [m.k, m]));
const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';

function Cella({ v }: { v: string }) {
  if (v === 'P') return <td className="bg-verde/10 text-center font-bold text-verde" title="Presente">✓</td>;
  if (v === 'A') return <td className="bg-rosso/10 text-center font-bold text-rosso" title="Assente, motivo da indicare">✗</td>;
  if (MOTIVO[v]) return <td className="bg-oro/15 text-center font-bold text-inchiostro" title={`Assente: ${MOTIVO[v].l}`}>{MOTIVO[v].s}</td>;
  return <td />;
}

export function Presenze({ squadraId, giocatori: rosa, allenamenti, aperto: apertoIniziale, oggi, soloLettura, gruppi, etaDi, gruppoIniziale }: {
  squadraId: string; giocatori: Giocatore[]; allenamenti: Allenamento[]; aperto: string | null; oggi: string; soloLettura: boolean;
  gruppi?: GruppoPortieri[]; etaDi?: Record<string, number>; gruppoIniziale?: string;
}) {
  const [filtro, setFiltro] = useState(gruppoIniziale ?? 'tutti');
  const gruppo = gruppi?.find((g) => g.chiave === filtro);
  const perId = new Map(rosa.map((p) => [p.id, p]));
  const giocatori = gruppo ? gruppo.ids.map((id) => perId.get(id)!).filter(Boolean) : rosa;
  /* tabella: con "Tutti" una sezione per gruppo; un portiere può comparire in due gruppi */
  const sezioni = gruppi && !gruppo ? gruppi.map((g) => ({ g, righe: g.ids.map((id) => perId.get(id)!).filter(Boolean) }))
    : [{ g: null as GruppoPortieri | null, righe: giocatori }];
  const cat = (id: string) => etaDi?.[id] != null && <span className="ml-1 rounded bg-carta px-1 text-xs font-bold text-grigio">U{etaDi[id]}</span>;
  const sceltaGruppo = gruppi && gruppi.length > 0 && (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label="Portieri di">
      {[{ chiave: 'tutti', titolo: 'Tutti i portieri' }, ...gruppi].map((g) => (
        <button key={g.chiave} aria-pressed={filtro === g.chiave} onClick={() => setFiltro(g.chiave)}
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${filtro === g.chiave ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>{g.titolo}</button>
      ))}
    </div>
  );
  const [elenco, setElenco] = useState(allenamenti);
  const [aperto, setAperto] = useState<string | null>(apertoIniziale);
  const [nuovaData, setNuovaData] = useState(oggi);
  const { salva, messaggio } = useSalva();
  const tabella = useRef<HTMLDivElement>(null);
  const path = 'registro/' + squadraId;
  const ordinati = elenco.slice().sort((a, b) => a.date.localeCompare(b.date));
  const t = elenco.find((x) => x.id === aperto) ?? null;

  /* la tabella mostra la colonna più recente; l'indirizzo ricorda l'allenamento aperto (si può ricaricare) */
  useEffect(() => { if (tabella.current) tabella.current.scrollLeft = tabella.current.scrollWidth; }, [aperto]);
  function apri(id: string | null) {
    setAperto(id);
    const u = new URL(window.location.href);
    if (id) u.searchParams.set('allenamento', id); else u.searchParams.delete('allenamento');
    window.history.replaceState(null, '', u);
    window.scrollTo(0, 0);
  }
  function cambia(tr: Allenamento) {
    setElenco((l) => l.map((x) => (x.id === tr.id ? tr : x)));
    salva(path, [{ lista: 'trainings', id: tr.id, voce: tr }]);
  }
  function apriData(data: string) {
    const c = elenco.find((x) => x.date === data);
    if (c) return apri(c.id);
    if (soloLettura) return;
    const tr: Allenamento = { id: nuovoId('tr'), date: data, note: '', att: Object.fromEntries(giocatori.map((p) => [p.id, 'P'])) };
    setElenco((l) => [...l, tr]);
    salva(path, [{ lista: 'trainings', id: tr.id, voce: tr }], 0);
    apri(tr.id);
  }
  function elimina(tr: Allenamento) {
    if (!confirm(`Eliminare l'allenamento del ${fmtData(tr.date)}?`)) return;
    setElenco((l) => l.filter((x) => x.id !== tr.id));
    salva(path, [{ lista: 'trainings', id: tr.id, voce: null }], 0);
    apri(null);
  }

  /* ---------- scheda di un allenamento ---------- */
  if (t) {
    const vals = giocatori.map((p) => presenzaDi(t, p.id));
    const tuttiPresenti = { ...(t.att ?? {}), ...Object.fromEntries(giocatori.map((p) => [p.id, 'P'])) };
    const segna = (pid: string, v: string) => cambia({ ...t, att: { ...(t.att ?? {}), [pid]: v } });
    return (
      <div className="space-y-3">
        <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => apri(null)}>← Tabella allenamenti</button>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-2xl font-bold">Allenamento · {giorno(t.date)} {fmtData(t.date)}</h2>
          <div className="flex gap-2 text-sm">
            <span className="rounded-full bg-verde/10 px-3 py-1"><b>{vals.filter((v) => v === 'P').length}</b> presenti</span>
            <span className="rounded-full bg-rosso/10 px-3 py-1"><b>{vals.filter(assente).length}</b> assenti</span>
          </div>
        </div>
        {soloLettura && <p className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">Sola lettura.</p>}
        {sceltaGruppo}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label><span className="mb-1 block text-sm font-semibold text-grigio">Data</span>
            <input type="date" className="campo" value={t.date} readOnly={soloLettura} onChange={(e) => e.target.value && cambia({ ...t, date: e.target.value })} /></label>
          <label><span className="mb-1 block text-sm font-semibold text-grigio">Note (facoltative)</span>
            <input className="campo" placeholder="Es. seduta atletica" value={t.note ?? ''} readOnly={soloLettura} onChange={(e) => cambia({ ...t, note: e.target.value })} /></label>
        </div>
        {!soloLettura && (
          <div className="flex justify-between gap-2">
            <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => cambia({ ...t, att: tuttiPresenti })}>Tutti presenti</button>
            <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={() => elimina(t)}>Elimina allenamento</button>
          </div>
        )}
        <ul className="space-y-1.5">
          {giocatori.map((p) => {
            const v = presenzaDi(t, p.id), ass = assente(v);
            return (
              <li key={p.id} className={`rounded-xl border bg-white p-2.5 ${v === 'P' ? 'border-verde/40' : ass ? 'border-rosso/40' : 'border-linea'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{p.gk && '🧤 '}{p.name}{cat(p.id)}</span>
                  <div className="inline-flex overflow-hidden rounded-lg border border-linea" role="group" aria-label={`Presenza ${p.name}`}>
                    <button disabled={soloLettura} aria-pressed={v === 'P'} onClick={() => segna(p.id, 'P')}
                      className={`px-3 py-1.5 text-sm font-semibold ${v === 'P' ? 'bg-verde text-white' : 'bg-white'}`}>Presente</button>
                    <button disabled={soloLettura} aria-pressed={ass} onClick={() => segna(p.id, ass ? v : 'A')}
                      className={`px-3 py-1.5 text-sm font-semibold ${ass ? 'bg-rosso text-white' : 'bg-white'}`}>Assente</button>
                  </div>
                </div>
                {ass && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5" role="group" aria-label={`Motivo assenza ${p.name}`}>
                    {MOTIVI.map((m) => (
                      <button key={m.k} disabled={soloLettura} aria-pressed={v === m.k} onClick={() => segna(p.id, m.k)}
                        className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${v === m.k ? 'border-inchiostro bg-inchiostro text-white' : 'border-linea bg-white'}`}>{m.l}</button>
                    ))}
                    {v === 'A' && <span className="text-xs font-bold text-rosso">Scegli il motivo</span>}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-3">
          <button className="bottone" onClick={() => apri(null)}>Fatto</button>
          {!soloLettura && <span className="text-sm text-grigio">Si salva da solo a ogni tocco.</span>}
        </div>
        <Messaggio testo={messaggio} />
      </div>
    );
  }

  /* ---------- tabella ---------- */
  const oggiC = elenco.some((x) => x.date === oggi);
  const visibili = new Set(giocatori.map((p) => p.id));
  const riga = (p: Giocatore, k: string) => {
    const vals = ordinati.map((x) => presenzaDi(x, p.id));
    const P = vals.filter((v) => v === 'P').length, pct = percentuale(P, vals.filter((v) => assente(v) && v !== 'INF').length);
    return (
      <tr key={k}>
        <th scope="row" className="sticky left-0 z-[1] max-w-48 truncate bg-white px-2 py-1.5 text-left font-semibold">{p.gk && '🧤 '}{p.name}{cat(p.id)}</th>
        {vals.map((v, i) => <Cella key={i} v={v} />)}
        <td className="px-2 text-center font-semibold">{P}</td>
        <td className={`px-2 text-center font-semibold ${pct != null && pct < SOGLIA_PRESENZE ? 'text-rosso' : ''}`}>{pctTesto(pct)}</td>
      </tr>
    );
  };
  return (
    <div className="space-y-3">
      {sceltaGruppo}
      {!soloLettura && (
        <div className="flex flex-wrap items-center gap-2">
          <button className="bottone" onClick={() => apriData(oggi)}>{oggiC ? 'Apri l’allenamento di oggi' : '+ Allenamento di oggi'}</button>
          <span className="text-sm text-grigio">oppure</span>
          <input type="date" aria-label="Data allenamento" className="rounded-lg border border-linea bg-white px-2 py-2" value={nuovaData} onChange={(e) => setNuovaData(e.target.value)} />
          <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => nuovaData && apriData(nuovaData)}>Apri</button>
        </div>
      )}
      {ordinati.length === 0 ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun allenamento registrato.</p> : (
        <>
          <div ref={tabella} className="overflow-x-auto rounded-xl border border-linea bg-white">
            <table className="text-sm">
              <thead>
                <tr className="border-b border-linea">
                  <th className="sticky left-0 z-[1] bg-white px-2 py-1.5 text-left">Giocatore</th>
                  {ordinati.map((x) => (
                    <th key={x.id} className="p-0">
                      <button onClick={() => apri(x.id)} title="Apri e modifica" className="flex w-11 flex-col items-center px-1 py-1 leading-tight hover:bg-carta">
                        <small className="font-normal text-grigio">{giorno(x.date)}</small>{fmtData(x.date).slice(0, 5)}
                      </button>
                    </th>
                  ))}
                  <th className="px-2">Pres.</th><th className="px-2">%</th>
                </tr>
              </thead>
              {sezioni.map(({ g, righe }) => (
                <tbody key={g?.chiave ?? 'tutti'} className="divide-y divide-linea">
                  {g && (
                    <tr className="bg-carta">
                      <th scope="rowgroup" className="sticky left-0 z-[1] bg-carta px-2 py-1.5 text-left text-xs font-bold uppercase tracking-wider text-blu">{g.titolo}</th>
                      <td colSpan={ordinati.length + 2} />
                    </tr>
                  )}
                  {righe.map((p) => riga(p, (g?.chiave ?? '') + p.id))}
                </tbody>
              ))}
              <tfoot className="border-t border-linea">
                <tr>
                  <th className="sticky left-0 z-[1] bg-white px-2 py-1.5 text-left">Presenti</th>
                  {ordinati.map((x) => <td key={x.id} className="text-center">{Object.entries(x.att ?? {}).filter(([id, v]) => v === 'P' && visibili.has(id)).length}</td>)}
                  <td /><td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-sm text-grigio">
            Tocca una data per modificarla · ✓ presente · assente per {MOTIVI.map((m) => `${m.s} ${m.l.toLowerCase()}`).join(' · ')} · ✗ motivo non indicato. Gli infortuni non abbassano la %.
          </p>
        </>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
