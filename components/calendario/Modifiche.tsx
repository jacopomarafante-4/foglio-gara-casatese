'use client';
// Schede "Modifica" sotto le righe del calendario (come .fredit del Portale): partita (data, ora, avversario, campo, in casa)
// ed evento della società (titolo, tipo, data, orari, luogo, squadre, note). Ogni cambio passa subito a `cambia`.
import { siglaSquadra, type Evento, type Partita, type SquadraCal } from '@/lib/programma';
import { LUOGHI_EVENTO, TIPI_EVENTO } from '@/lib/calendario-portale';

const etichetta = 'mb-1 block text-sm font-semibold text-grigio';
const Campo = ({ l, children }: { l: string; children: React.ReactNode }) => <label><span className={etichetta}>{l}</span>{children}</label>;

export function ModificaPartita({ m, titolo, aperta, cambia, elimina, eliminaTesto }: {
  m: Partita; titolo: string; aperta?: boolean; cambia: (campi: Partial<Partita>) => void; elimina?: () => void; eliminaTesto?: string;
}) {
  return (
    <details className="mt-1.5" open={aperta}>
      <summary className="cursor-pointer text-[13px] font-bold text-blu">{titolo}</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Campo l="Data"><input type="date" className="campo" value={m.date || ''} onChange={(e) => cambia({ date: e.target.value })} /></Campo>
        <Campo l="Ora"><input type="time" className="campo" value={m.time || ''} onChange={(e) => cambia({ time: e.target.value })} /></Campo>
        <Campo l="Avversario"><input className="campo" placeholder="Avversario" value={m.opponent || ''} onChange={(e) => cambia({ opponent: e.target.value })} /></Campo>
        <Campo l="Campo"><input className="campo" placeholder="Campo" value={m.venue || ''} onChange={(e) => cambia({ venue: e.target.value })} /></Campo>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2"><input type="checkbox" className="size-5" checked={!!m.home} onChange={(e) => cambia({ home: e.target.checked })} /> In casa</label>
        {elimina && <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rosso hover:bg-rosso/5" onClick={elimina}>{eliminaTesto ?? 'Elimina'}</button>}
      </div>
    </details>
  );
}

export function ModificaEvento({ e, squadre, aperta, cambia, elimina }: {
  e: Evento; squadre: SquadraCal[]; aperta?: boolean; cambia: (campi: Partial<Evento>) => void; elimina: () => void;
}) {
  const scelte = e.squadre ?? [];
  return (
    <details className="mt-1.5" open={aperta}>
      <summary className="cursor-pointer text-[13px] font-bold text-blu">Modifica evento</summary>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Campo l="Titolo"><input className="campo" placeholder="Es. Torneo di Natale" value={e.titolo || ''} onChange={(x) => cambia({ titolo: x.target.value })} /></Campo>
        <Campo l="Tipo"><select className="campo" value={e.tipo || TIPI_EVENTO[0]} onChange={(x) => cambia({ tipo: x.target.value })}>{TIPI_EVENTO.map((t) => <option key={t}>{t}</option>)}</select></Campo>
        <Campo l="Data"><input type="date" className="campo" value={e.data || ''} onChange={(x) => cambia({ data: x.target.value })} /></Campo>
        <Campo l="Luogo"><select className="campo" value={e.luogo || 'merate'} onChange={(x) => cambia({ luogo: x.target.value as Evento['luogo'] })}>
          {Object.entries(LUOGHI_EVENTO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Campo>
        <Campo l="Dalle"><input type="time" className="campo" value={e.inizio || ''} onChange={(x) => cambia({ inizio: x.target.value })} /></Campo>
        <Campo l="Alle"><input type="time" className="campo" value={e.fine || ''} onChange={(x) => cambia({ fine: x.target.value })} /></Campo>
        {e.luogo === 'altro' && <Campo l="Indirizzo"><input className="campo" placeholder="Via, paese" value={e.indirizzo || ''} onChange={(x) => cambia({ indirizzo: x.target.value })} /></Campo>}
      </div>
      <p className={`${etichetta} mt-2`}>Squadre coinvolte <span className="font-normal">(nessuna = tutta la società)</span></p>
      <div className="flex flex-wrap gap-1.5">
        {squadre.map((t) => {
          const on = scelte.includes(t.id);
          return (
            <button key={t.id} aria-pressed={on} onClick={() => cambia({ squadre: on ? scelte.filter((x) => x !== t.id) : [...scelte, t.id] })}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${on ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>{siglaSquadra(t)}</button>
          );
        })}
      </div>
      <label className="mt-2 block"><span className={etichetta}>Note</span>
        <textarea className="campo" rows={2} value={e.note || ''} onChange={(x) => cambia({ note: x.target.value })} /></label>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <a href={`/calendari/avvisi?evento=${encodeURIComponent(e.id)}`} className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu">Scrivi un avviso per questo evento</a>
        <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-rosso hover:bg-rosso/5" onClick={elimina}>Elimina evento</button>
      </div>
    </details>
  );
}
