'use client';
// Segreteria → Tesserati: un ragazzo per riga (si apre per modificarlo), filtri per le cose da sistemare, salvataggio
// automatico con un attimo di attesa mentre si scrive. Scrive direttamente nelle tabelle protette: i permessi li
// controlla il database (RLS "segreteria: …", gestisce_segreteria()).
import '@fontsource/barlow/700.css';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { scaricaFogliPin } from '@/lib/fogli-pin';

export type SquadraRosa = { id: string; name: string; category: string | null; players: { id: string; name: string }[] };
type Quota = { rata?: string; importo?: string; scadenza?: string; pagata?: boolean };
type Dati = {
  genitore1_nome?: string | null; genitore1_tel?: string | null; genitore1_email?: string | null;
  genitore2_nome?: string | null; genitore2_tel?: string | null; genitore2_email?: string | null;
  certificato_scadenza?: string | null; taglia_divisa?: string | null; taglia_tuta?: string | null;
  iscrizione_completa?: boolean; documenti_mancanti?: string | null; quote?: Quota[]; note_segreteria?: string | null;
};
type Base = { id: string; squadra_id: string; giocatore_id: string; nome_completo: string; data_nascita: string | null; numero: number | null; pin: string | null };
export type Tesserato = Base & { tesserati_dati: Dati | Dati[] | null };
export type DocumentoFamiglia = {
  id: string; tesserato_id: string; tipo: string; rata: number | null; descrizione: string | null; nome_file: string;
  mime: string; dimensione: number; caricato_il: string; stato: 'da_controllare' | 'accettato' | 'rifiutato'; nota: string | null;
};
type Riga = Base & { dati: Dati };

const TIPI_DOC: Record<string, string> = { visita_medica: 'Visita medica', bonifico: 'Contabile di bonifico', altro: 'Altro documento' };
const FILTRI = { '': 'Tutti', cert: 'Certificato da sistemare', iscr: 'Iscrizione incompleta', quote: 'Rate da pagare', pin: 'Senza PIN famiglia', doc: 'Documenti da controllare' } as const;
type Filtro = keyof typeof FILTRI;

const riga = (t: Tesserato): Riga => {
  const { tesserati_dati, ...base } = t;
  return { ...base, dati: (Array.isArray(tesserati_dati) ? tesserati_dati[0] : tesserati_dati) ?? {} };
};
const fmtData = (iso: string) => iso.slice(0, 10).split('-').reverse().join('/');
const perNome = (a: Riga, b: Riga) => a.nome_completo.localeCompare(b.nome_completo, 'it');
const daPagare = (d: Dati) => (d.quote ?? []).filter((q) => !q.pagata);

const BADGE = {
  ok: 'bg-carta text-grigio border-linea',
  scade: 'bg-oro text-inchiostro border-oro',
  scaduto: 'bg-rosso text-white border-rosso',
  manca: 'bg-rosso text-white border-rosso',
};
function Badge({ k, children }: { k: keyof typeof BADGE; children: React.ReactNode }) {
  return <span className={`rounded-full border px-2 py-0.5 text-[11px] font-bold ${BADGE[k]}`}>{children}</span>;
}
function Titoletto({ children }: { children: React.ReactNode }) {
  return <h4 className="mb-1.5 mt-4 font-display text-[13px] font-semibold uppercase tracking-wider text-grigio">{children}</h4>;
}
function Campo({ etichetta, children }: { etichetta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-grigio">{etichetta}</span>
      {children}
    </label>
  );
}
const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';

export function Tesserati({ squadre, iniziali, documenti, oggi }: {
  squadre: SquadraRosa[]; iniziali: Tesserato[]; documenti: DocumentoFamiglia[]; oggi: string;
}) {
  const [supabase] = useState(createClient);
  const [lista, setLista] = useState<Riga[]>(() => iniziali.map(riga));
  const [docs, setDocs] = useState(documenti);
  const [squadra, setSquadra] = useState(squadre[0]?.id ?? '');
  const [filtro, setFiltro] = useState<Filtro>('');
  const [aperto, setAperto] = useState<string | null>(null);
  const [messaggio, setMessaggio] = useState('');
  const timer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const pendenti = useRef<Record<string, Partial<Base>>>({});
  const ultimi = useRef<Record<string, Dati>>({});
  const create = useRef(new Set<string>());

  /* Ogni giocatore della rosa ha il suo tesserato: si crea la prima volta che si apre la squadra */
  useEffect(() => {
    const sq = squadre.find((s) => s.id === squadra);
    if (!sq || create.current.has(sq.id)) return;
    create.current.add(sq.id);
    const nuovi = sq.players.filter((p) => !lista.some((t) => t.squadra_id === sq.id && t.giocatore_id === p.id))
      .map((p) => ({ squadra_id: sq.id, giocatore_id: p.id, nome_completo: p.name }));
    if (!nuovi.length) return;
    supabase.from('tesserati').insert(nuovi).select('*, tesserati_dati(*)').then(({ data, error }) => {
      if (!error && data) setLista((l) => [...l, ...(data as Tesserato[]).map(riga)]);
    });
  }, [squadra, squadre, lista, supabase]);

  const giorniA = (d?: string | null) => (d ? Math.round((Date.parse(d + 'T12:00:00') - Date.parse(oggi + 'T12:00:00')) / 86400000) : null);
  const certificato = (d: Dati) => {
    const g = giorniA(d.certificato_scadenza);
    if (g == null) return { k: 'manca' as const, l: 'Certificato mancante' };
    if (g < 0) return { k: 'scaduto' as const, l: 'Certificato scaduto' };
    if (g <= 30) return { k: 'scade' as const, l: `Certificato: scade tra ${g} giorni` };
    return { k: 'ok' as const, l: 'Certificato ok' };
  };
  const docsDi = (t: Riga) => docs.filter((d) => d.tesserato_id === t.id);
  const daControllare = (t: Riga) => docsDi(t).filter((d) => d.stato === 'da_controllare').length;
  const passa: Record<Filtro, (t: Riga) => boolean> = {
    '': () => true,
    cert: (t) => certificato(t.dati).k !== 'ok',
    iscr: (t) => !t.dati.iscrizione_completa,
    quote: (t) => daPagare(t.dati).length > 0,
    pin: (t) => !t.pin,
    doc: (t) => daControllare(t) > 0,
  };

  /* ---------- Salvataggio (con un attimo di attesa mentre si scrive) ---------- */
  function salvaTesserato(t: Riga, campi: Partial<Base>) {
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, ...campi } : x)));
    pendenti.current[t.id] = { ...pendenti.current[t.id], ...campi };
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current['t' + t.id]);
    timer.current['t' + t.id] = setTimeout(async () => {
      const c = pendenti.current[t.id]; delete pendenti.current[t.id];
      const { error } = await supabase.from('tesserati').update({ ...c, updated_at: new Date().toISOString() }).eq('id', t.id);
      setMessaggio(error ? 'Non salvato: riprova' : 'Salvato');
    }, 600);
  }
  function salvaDati(t: Riga, campi: Partial<Dati>) {
    const d = { ...(ultimi.current[t.id] ?? t.dati), ...campi };
    ultimi.current[t.id] = d;
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, dati: d } : x)));
    setMessaggio('Salvataggio…');
    clearTimeout(timer.current['d' + t.id]);
    timer.current['d' + t.id] = setTimeout(async () => {
      const { error } = await supabase.from('tesserati_dati')
        .upsert({ ...ultimi.current[t.id], tesserato_id: t.id, updated_at: new Date().toISOString() });
      setMessaggio(error ? 'Non salvato: riprova' : 'Salvato');
    }, 600);
  }
  const cambiaQuota = (t: Riga, i: number, campi: Partial<Quota>) =>
    salvaDati(t, { quote: (t.dati.quote ?? []).map((q, j) => (j === i ? { ...q, ...campi } : q)) });

  /* ---------- PIN e documenti ---------- */
  async function generaPin(t: Riga) {
    if (t.pin && !confirm('Rigenerare il PIN? Quello vecchio smette di funzionare.')) return;
    const { data, error } = await supabase.rpc('genera_pin_famiglia', { p_tesserato: t.id });
    if (error) { setMessaggio('PIN non generato: riprova'); return; }
    setLista((l) => l.map((x) => (x.id === t.id ? { ...x, pin: data as string } : x)));
    setMessaggio('PIN generato');
  }
  async function fogli(elenco: Riga[]) {
    const categoria = squadre.find((s) => s.id === squadra);
    const fatto = await scaricaFogliPin(elenco.map((t) => ({ nome: t.nome_completo, pin: t.pin ?? '', categoria: categoria?.category || categoria?.name || '' })))
      .catch(() => null);
    setMessaggio(fatto ? 'Foglio PIN pronto' : fatto === false ? 'Nessun PIN da stampare: generali prima' : 'Foglio PIN non creato: riprova');
  }
  async function apriDocumento(id: string) {
    const w = window.open('', '_blank');   // aperta subito: i telefoni bloccano le finestre aperte dopo un'attesa
    const { data, error } = await supabase.rpc('documento_scarica', { p_id: id });
    if (error || !data) { w?.close(); setMessaggio('Documento non aperto: riprova'); return; }
    const bin = atob(data.base64), arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([arr], { type: data.mime }));
    if (w) w.location.assign(url); else window.location.assign(url);
  }
  async function esitoDocumento(dc: DocumentoFamiglia, t: Riga, ok: boolean) {
    let nota: string | null = null;
    if (!ok) { nota = prompt('Perché lo rifiuti? La famiglia vedrà questa nota.', 'Foto non leggibile'); if (nota === null) return; }
    const stato = ok ? 'accettato' as const : 'rifiutato' as const;
    const { error } = await supabase.from('documenti_tesserati').update({ stato, nota }).eq('id', dc.id);
    if (error) { setMessaggio('Non salvato: riprova'); return; }
    setDocs((l) => l.map((x) => (x.id === dc.id ? { ...x, stato, nota } : x)));
    /* accettato: la rata diventa pagata, la visita aggiorna la scadenza del certificato */
    if (ok && dc.tipo === 'bonifico' && dc.rata != null && (t.dati.quote ?? [])[dc.rata]) cambiaQuota(t, dc.rata, { pagata: true });
    if (ok && dc.tipo === 'visita_medica') {
      const m = (prompt('Fino a quando vale il nuovo certificato? (gg/mm/aaaa)', '') ?? '').match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
      if (m) salvaDati(t, { certificato_scadenza: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` });
    }
    setMessaggio(ok ? 'Documento accettato' : 'Documento rifiutato');
  }

  const tess = lista.filter((t) => t.squadra_id === squadra).sort(perNome);
  const mostrati = tess.filter(passa[filtro]);
  const testoD = (t: Riga, k: keyof Dati, etichetta: string, tipo = 'text', ph = '') => (
    <Campo etichetta={etichetta}>
      <input type={tipo} className="campo" value={String(t.dati[k] ?? '')} placeholder={ph}
        onChange={(e) => salvaDati(t, { [k]: e.target.value || null })} />
    </Campo>
  );

  if (!squadre.length) return <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna squadra con la rosa.</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-56 flex-1 sm:max-w-xs">
          <span className="mb-1 block text-sm font-semibold text-grigio">Squadra</span>
          <select className="campo" value={squadra} onChange={(e) => { setSquadra(e.target.value); setAperto(null); }}>
            {squadre.map((s) => <option key={s.id} value={s.id}>{s.category || s.name}</option>)}
          </select>
        </label>
        <button className={`${piccolo} border-blu text-blu hover:bg-blu/5`} onClick={() => fogli(tess)}>Stampa i PIN della squadra (PDF)</button>
      </div>

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtri">
        {(Object.keys(FILTRI) as Filtro[]).map((k) => (
          <button key={k} aria-pressed={k === filtro} onClick={() => setFiltro(k)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold ${k === filtro ? 'border-blu bg-blu text-white' : 'border-linea bg-white text-inchiostro hover:border-blu'}`}>
            {FILTRI[k]} <span className="opacity-70">{tess.filter(passa[k]).length}</span>
          </button>
        ))}
      </div>

      {mostrati.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun ragazzo con questo filtro.</p>
      ) : (
        <ul className="space-y-2">
          {mostrati.map((t) => {
            const d = t.dati, c = certificato(d), qd = daPagare(d), nd = daControllare(t);
            const aPosto = c.k === 'ok' && d.iscrizione_completa && !qd.length;
            return (
              <li key={t.id}>
                <details open={aperto === t.id} className={`rounded-xl border border-l-4 border-linea bg-white ${aPosto ? 'border-l-linea' : 'border-l-oro'}`}
                  onToggle={(e) => { const o = e.currentTarget.open; setAperto((a) => (o ? t.id : a === t.id ? null : a)); }}>
                  <summary className="cursor-pointer list-none px-4 py-3">
                    <p className="font-semibold">{t.nome_completo}{t.numero != null && <span className="ml-2 text-sm font-normal text-grigio">N. {t.numero}</span>}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge k={c.k}>{c.k === 'ok' ? 'Certificato ok' : c.l}</Badge>
                      {d.iscrizione_completa ? <Badge k="ok">Iscritto</Badge> : <Badge k="scade">Iscrizione da completare</Badge>}
                      {qd.length > 0 && <Badge k="scade">{qd.length} {qd.length === 1 ? 'rata' : 'rate'} da pagare</Badge>}
                      {t.pin ? <Badge k="ok">PIN famiglia</Badge> : <Badge k="manca">Senza PIN</Badge>}
                      {nd > 0 && <Badge k="scade">{nd} {nd === 1 ? 'documento' : 'documenti'} da controllare</Badge>}
                    </div>
                  </summary>

                  {aperto === t.id && (
                    <div className="border-t border-linea px-4 pb-4">
                      <Titoletto>Ragazzo</Titoletto>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Campo etichetta="Data di nascita">
                          <input type="date" className="campo" value={t.data_nascita ?? ''} onChange={(e) => salvaTesserato(t, { data_nascita: e.target.value || null })} />
                        </Campo>
                        <Campo etichetta="Numero di maglia">
                          <input type="number" inputMode="numeric" className="campo" value={t.numero ?? ''}
                            onChange={(e) => salvaTesserato(t, { numero: e.target.value === '' ? null : Number(e.target.value) })} />
                        </Campo>
                        {testoD(t, 'taglia_divisa', 'Taglia divisa', 'text', 'Es. M')}
                        {testoD(t, 'taglia_tuta', 'Taglia tuta', 'text', 'Es. 152')}
                      </div>

                      <Titoletto>Genitori</Titoletto>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        {testoD(t, 'genitore1_nome', 'Genitore 1')}{testoD(t, 'genitore1_tel', 'Telefono', 'tel')}{testoD(t, 'genitore1_email', 'Email', 'email')}
                        {testoD(t, 'genitore2_nome', 'Genitore 2')}{testoD(t, 'genitore2_tel', 'Telefono', 'tel')}{testoD(t, 'genitore2_email', 'Email', 'email')}
                      </div>

                      <Titoletto>Certificato medico e iscrizione</Titoletto>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {testoD(t, 'certificato_scadenza', 'Certificato valido fino al', 'date')}
                        {testoD(t, 'documenti_mancanti', 'Documenti mancanti', 'text', 'Es. foto, modulo privacy')}
                      </div>
                      <label className="mt-3 flex items-center gap-2">
                        <input type="checkbox" className="size-5" checked={!!d.iscrizione_completa} onChange={(e) => salvaDati(t, { iscrizione_completa: e.target.checked })} />
                        Iscrizione e tesseramento completati
                      </label>

                      <Titoletto>Quote</Titoletto>
                      {(d.quote ?? []).length === 0 && <p className="text-sm text-grigio">Nessuna rata.</p>}
                      {(d.quote ?? []).map((q, i) => (
                        <div key={i} className="mb-2 grid grid-cols-2 items-center gap-2 sm:grid-cols-[1.2fr_.8fr_1.2fr_auto_auto]">
                          <input className="campo" aria-label="Rata" placeholder="Es. 1ª rata" value={q.rata ?? ''} onChange={(e) => cambiaQuota(t, i, { rata: e.target.value })} />
                          <input className="campo" aria-label="Importo" placeholder="€" inputMode="decimal" value={q.importo ?? ''} onChange={(e) => cambiaQuota(t, i, { importo: e.target.value })} />
                          <input type="date" className="campo" aria-label="Scadenza" value={q.scadenza ?? ''} onChange={(e) => cambiaQuota(t, i, { scadenza: e.target.value })} />
                          <label className="flex items-center gap-1.5">
                            <input type="checkbox" className="size-5" checked={!!q.pagata} onChange={(e) => cambiaQuota(t, i, { pagata: e.target.checked })} /> Pagata
                          </label>
                          <button aria-label="Togli rata" className="justify-self-end rounded-md px-3 py-2 text-xl leading-none text-grigio hover:text-rosso"
                            onClick={() => salvaDati(t, { quote: (d.quote ?? []).filter((_, j) => j !== i) })}>×</button>
                        </div>
                      ))}
                      <button className={`${piccolo} border-linea hover:border-blu`}
                        onClick={() => salvaDati(t, { quote: [...(d.quote ?? []), { rata: '', importo: '', scadenza: '', pagata: false }] })}>+ Aggiungi rata</button>

                      <Titoletto>Documenti caricati dalla famiglia</Titoletto>
                      {docsDi(t).length === 0 && <p className="text-sm text-grigio">Nessun documento caricato.</p>}
                      {docsDi(t).map((dc) => (
                        <div key={dc.id} className={`mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-l-4 border-linea bg-carta px-3 py-2 ${
                          dc.stato === 'accettato' ? 'border-l-blu' : dc.stato === 'rifiutato' ? 'border-l-rosso' : 'border-l-oro'}`}>
                          <div className="min-w-0">
                            <b>{TIPI_DOC[dc.tipo] ?? dc.tipo}</b>
                            {dc.tipo === 'bonifico' && dc.rata != null && ` · ${(d.quote ?? [])[dc.rata]?.rata || `rata ${dc.rata + 1}`}`}
                            {dc.descrizione && ` · ${dc.descrizione}`}
                            <p className="text-sm text-grigio">
                              {[fmtData(dc.caricato_il), dc.nome_file, `${Math.round(dc.dimensione / 1024)} KB`, dc.nota].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => apriDocumento(dc.id)}>Apri</button>
                            {dc.stato !== 'accettato'
                              ? <button className={`${piccolo} border-blu bg-blu text-white`} onClick={() => esitoDocumento(dc, t, true)}>Accetta</button>
                              : <Badge k="ok">Accettato</Badge>}
                            {dc.stato !== 'rifiutato'
                              ? <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={() => esitoDocumento(dc, t, false)}>Rifiuta</button>
                              : <Badge k="scaduto">Rifiutato</Badge>}
                          </div>
                        </div>
                      ))}

                      <Titoletto>Note della segreteria <span className="normal-case tracking-normal">(la famiglia non le vede)</span></Titoletto>
                      <textarea className="campo min-h-20" value={d.note_segreteria ?? ''} onChange={(e) => salvaDati(t, { note_segreteria: e.target.value || null })} />

                      <Titoletto>Accesso della famiglia</Titoletto>
                      {t.pin
                        ? <p>PIN: <span className="rounded bg-carta px-2 py-0.5 font-mono font-bold tracking-widest">{t.pin}</span></p>
                        : <p className="text-sm text-grigio">Nessun PIN: generalo e consegnalo alla famiglia col foglio PIN.</p>}
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button className={`${piccolo} ${t.pin ? 'border-linea hover:border-blu' : 'border-blu bg-blu text-white'}`} onClick={() => generaPin(t)}>
                          {t.pin ? 'Rigenera PIN' : 'Genera PIN'}
                        </button>
                        {t.pin && <button className={`${piccolo} border-blu bg-blu text-white`} onClick={() => fogli([t])}>Foglio PIN (PDF)</button>}
                      </div>
                    </div>
                  )}
                </details>
              </li>
            );
          })}
        </ul>
      )}

      {messaggio && (
        <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">
          {messaggio}
        </p>
      )}
    </div>
  );
}
