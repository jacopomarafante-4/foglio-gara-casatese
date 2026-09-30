'use client';
// Modulistica → Distinta: dati della manifestazione, giocatori scelti (numero, nascita, tessera), allenatore e dirigenti,
// note. Si salva da sola nel foglio della squadra (salvaDistinta, con un attimo di attesa mentre si scrive) e si scarica in
// PDF, con una copia nell'Archivio documenti. I direttori la vedono e scaricano, ma non la cambiano.
import '@fontsource/barlow/700.css';
import { useRef, useState } from 'react';
import { RUOLI_STAFF, TIPI_DISTINTA, categoriaDistinta, numeroPartita, type Distinta, type Foglio, type GiocatoreDistinta } from '@/lib/distinta';
import { impaginaDistinta } from '@/lib/pdf-distinta';
import { scarica } from '@/lib/pdf-moduli';
import { archiviaPdf, salvaDistinta } from '@/app/(aree)/modulistica/actions';

const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';
const etichetta = 'mb-1 block text-sm font-semibold text-grigio';

export function DistintaForm({ squadraId, categoria, giocatori, foglio, iniziale, soloLettura }: {
  squadraId: string; categoria: string; giocatori: { id: string; name: string }[]; foglio: Foglio; iniziale: Distinta; soloLettura: boolean;
}) {
  const [d, setD] = useState<Distinta>(iniziale);
  const [senzaCat, setSenzaCat] = useState(!!foglio.senzaCategoria);
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  /* ogni modifica: si mostra subito e si salva dopo un attimo (l'ultima vince) */
  function cambia(nuova: Distinta, senza = senzaCat) {
    setD(nuova); setSenzaCat(senza);
    if (soloLettura) return;
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const r = await salvaDistinta(squadraId, nuova, senza).catch(() => ({ ok: false, errore: 'rete assente' }));
      setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    }, 700);
  }
  const campo = (k: 'manifestazione' | 'data' | 'luogo', l: string, tipo = 'text', ph = '') => (
    <label>
      <span className={etichetta}>{l}</span>
      <input type={tipo} className="campo" value={d[k] || ''} placeholder={ph} readOnly={soloLettura} onChange={(e) => cambia({ ...d, [k]: e.target.value })} />
    </label>
  );
  const giocatore = (pid: string, campi: GiocatoreDistinta) => cambia({ ...d, giocatori: { ...d.giocatori, [pid]: { ...(d.giocatori[pid] ?? { sel: true }), ...campi } } });
  const tutti = (sel: boolean) => cambia({ ...d, giocatori: Object.fromEntries(giocatori.map((p) => [p.id, { ...d.giocatori[p.id], sel }])) });
  const scelti = giocatori.filter((p) => d.giocatori[p.id]?.sel).length;

  async function pdf() {
    setMessaggio('Preparo il PDF…');
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
      const gg = giocatori.filter((p) => d.giocatori[p.id]?.sel).map((p) => ({ ...d.giocatori[p.id], nome: p.name }));
      const nome = await impaginaDistinta(doc, d, gg, categoriaDistinta(categoria, senzaCat));
      const blob = doc.output('blob');
      scarica(nome, blob);
      setMessaggio('PDF pronto');
      archiviaPdf(nome, 'Distinta', blob, squadraId).catch(() => { /* il PDF c'è comunque */ });
    } catch {
      setMessaggio('PDF non creato: riprova');
    }
  }

  return (
    <div className="space-y-4">
      {soloLettura && <p className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">Sola lettura: la distinta la compila il mister.</p>}
      <label className="flex items-center gap-2">
        <input type="checkbox" className="size-5" checked={!senzaCat} disabled={soloLettura} onChange={(e) => cambia(d, !e.target.checked)} />
        Mostra la categoria nell&apos;intestazione del PDF
      </label>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label>
          <span className={etichetta}>Tipo</span>
          <select className="campo" value={d.tipo} disabled={soloLettura} onChange={(e) => cambia({ ...d, tipo: e.target.value })}>
            {TIPI_DISTINTA.map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        {campo('manifestazione', 'Manifestazione', 'text', 'Es. Torneo di Natale')}
        {campo('data', 'Data', 'date')}
        {campo('luogo', 'Luogo', 'text', 'Campo, paese')}
      </div>

      <div>
        <h2 className="font-display text-xl font-bold">Giocatori <span className="font-sans text-sm font-normal text-grigio">({scelti} scelti)</span></h2>
        {!soloLettura && (
          <div className="my-2 flex gap-2">
            <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => tutti(true)}>Tutti</button>
            <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => tutti(false)}>Nessuno</button>
          </div>
        )}
        {giocatori.length === 0 && <p className="text-sm text-grigio">Nessun giocatore nella rosa.</p>}
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-white">
          {giocatori.map((p) => {
            const g = d.giocatori[p.id] ?? {};
            return (
              <li key={p.id} className={`px-3 py-2 ${g.sel ? 'bg-blu/5' : ''}`}>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="size-5" checked={!!g.sel} disabled={soloLettura} onChange={(e) => giocatore(p.id, { sel: e.target.checked })} />
                  <b>{p.name}</b>
                </label>
                {g.sel && (
                  <div className="mt-2 grid grid-cols-[4.5rem_1fr_1fr] gap-2">
                    <input className="campo" aria-label="Numero" placeholder="N°" inputMode="numeric" readOnly={soloLettura}
                      value={g.numero ?? numeroPartita(foglio, p.id)} onChange={(e) => giocatore(p.id, { numero: e.target.value })} />
                    <input type="date" className="campo" aria-label="Data di nascita" readOnly={soloLettura} value={g.nascita ?? ''}
                      onChange={(e) => giocatore(p.id, { nascita: e.target.value })} />
                    <input className="campo" aria-label="Tessera" placeholder="N° tessera" readOnly={soloLettura} value={g.tessera ?? ''}
                      onChange={(e) => giocatore(p.id, { tessera: e.target.value })} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <h2 className="mb-2 font-display text-xl font-bold">Allenatore e dirigenti</h2>
        {d.staff.map((st, i) => {
          const cambiaStaff = (campi: Partial<typeof st>) => cambia({ ...d, staff: d.staff.map((x, j) => (j === i ? { ...x, ...campi } : x)) });
          return (
            <div key={i} className="mb-2 grid grid-cols-2 items-center gap-2 sm:grid-cols-[1.2fr_1.5fr_1.2fr_auto]">
              <select className="campo" aria-label="Ruolo" value={st.ruolo} disabled={soloLettura} onChange={(e) => cambiaStaff({ ruolo: e.target.value })}>
                {RUOLI_STAFF.map((r) => <option key={r}>{r}</option>)}
              </select>
              <input className="campo" aria-label="Nome" placeholder="Cognome e nome" readOnly={soloLettura} value={st.nome} onChange={(e) => cambiaStaff({ nome: e.target.value })} />
              <input className="campo" aria-label="Documento" placeholder="Documento / tessera" readOnly={soloLettura} value={st.documento} onChange={(e) => cambiaStaff({ documento: e.target.value })} />
              {!soloLettura && (
                <button aria-label="Togli" className="justify-self-end rounded-md px-3 py-2 text-xl leading-none text-grigio hover:text-rosso"
                  onClick={() => cambia({ ...d, staff: d.staff.filter((_, j) => j !== i) })}>×</button>
              )}
            </div>
          );
        })}
        {!soloLettura && (
          <button className={`${piccolo} border-linea bg-white hover:border-blu`}
            onClick={() => cambia({ ...d, staff: [...d.staff, { ruolo: 'Dirigente accompagnatore', nome: '', documento: '' }] })}>+ Aggiungi</button>
        )}
      </div>

      <label className="block">
        <span className={etichetta}>Note</span>
        <textarea className="campo" rows={2} readOnly={soloLettura} value={d.note || ''} onChange={(e) => cambia({ ...d, note: e.target.value })} />
      </label>
      <button className="bottone" onClick={pdf}>Scarica distinta PDF</button>

      {messaggio && (
        <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {messaggio}
        </p>
      )}
    </div>
  );
}
