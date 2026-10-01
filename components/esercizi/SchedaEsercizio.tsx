'use client';
// Scheda di un esercizio (Esercitazioni, solo admin): i 4 pilastri (obiettivo, giocatori, spazi, principio), tipo, fase, categorie,
// durata e giorno del morfociclo, testi, e la lavagna. Si salva da sola dopo un attimo (salvaEsercizio, solo i campi cambiati).
// L'Area per Giocatore si calcola mentre si scrivono misure e giocatori.
import { useRef, useState } from 'react';
import Link from 'next/link';
import { salvaEsercizio, duplicaEsercizio, eliminaEsercizio } from '@/app/(aree)/esercitazioni/actions';
import { CATEGORIE, FASI, MORFOCICLO, TIPI, areaPerGiocatore, durataTotale, fasciaApP, type Esercizio, type Lavagna as Dati } from '@/lib/esercizi';
import { Lavagna, STRUMENTI, type Strumento } from './Lavagna';

const etichetta = 'mb-1 block text-sm font-semibold text-grigio';
const numero = (v: string) => (v.trim() === '' ? null : Math.max(0, Number(v.replace(',', '.'))) || 0);

export function SchedaEsercizio({ iniziale, origine }: { iniziale: Esercizio; origine: { id: string; titolo: string; autore: string | null } | null }) {
  const [e, setE] = useState(iniziale);
  const [stato, setStato] = useState('');
  const [strumento, setStrumento] = useState<Strumento>('sposta');
  const [scelto, setScelto] = useState<{ tipo: 'elemento' | 'tracciato' | 'zona'; id: string } | null>(null);
  const pendenti = useRef<Partial<Esercizio>>({});
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ultima = useRef({ lunghezza: iniziale.lunghezza ?? 30, larghezza: iniziale.larghezza ?? 20 });

  function cambia(campi: Partial<Esercizio>, attesa = 800) {
    setE((x) => ({ ...x, ...campi }));
    Object.assign(pendenti.current, campi);
    setStato('Salvataggio…');
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      const c = pendenti.current; pendenti.current = {};
      const r = await salvaEsercizio(e.id, c).catch(() => ({ ok: false, errore: 'rete assente' }));
      setStato(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
    }, attesa);
  }
  const lavagna = (d: Dati) => cambia({ lavagna: d }, 500);
  /** Misure del campo cambiate: giocatori, frecce e zone seguono in proporzione (restano dentro il campo) */
  function misura(k: 'lunghezza' | 'larghezza', v: number | null) {
    // misura di prima: quella scritta, o l'ultima valida se il campo era stato svuotato mentre si scriveva
    const prima = e[k] || ultima.current[k];
    if (v) ultima.current[k] = v;
    const fx = k === 'lunghezza' && prima && v ? v / prima : 1, fy = k === 'larghezza' && prima && v ? v / prima : 1;
    const d = e.lavagna, sx = (x: number) => +(x * fx).toFixed(2), sy = (y: number) => +(y * fy).toFixed(2);
    cambia({ [k]: v, lavagna: fx === 1 && fy === 1 ? d : {
      elementi: (d.elementi ?? []).map((x) => ({ ...x, x: sx(x.x), y: sy(x.y) })),
      tracciati: (d.tracciati ?? []).map((t) => ({ ...t, x1: sx(t.x1), y1: sy(t.y1), x2: sx(t.x2), y2: sy(t.y2) })),
      zone: (d.zone ?? []).map((z) => ({ ...z, x: sx(z.x), y: sy(z.y), w: sx(z.w), h: sy(z.h) })),
    } } as Partial<Esercizio>);
  }
  const app = areaPerGiocatore(e), fascia = fasciaApP(app), durata = durataTotale(e);
  const fase = FASI.find((f) => f.k === e.fase);
  const el = scelto?.tipo === 'elemento' ? (e.lavagna.elementi ?? []).find((x) => x.id === scelto.id) : undefined;
  function togli() {
    if (!scelto) return;
    const d = e.lavagna;
    lavagna(scelto.tipo === 'elemento' ? { ...d, elementi: (d.elementi ?? []).filter((x) => x.id !== scelto.id) }
      : scelto.tipo === 'tracciato' ? { ...d, tracciati: (d.tracciati ?? []).filter((x) => x.id !== scelto.id) }
      : { ...d, zone: (d.zone ?? []).filter((x) => x.id !== scelto.id) });
    setScelto(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/esercitazioni" className="text-sm font-semibold text-blu">‹ Tutti gli esercizi</Link>
        <div className="flex gap-2">
          <form action={duplicaEsercizio}><input type="hidden" name="id" value={e.id} />
            <button className="rounded-lg border border-linea bg-white px-3 py-2 text-sm font-semibold hover:border-blu">Duplica</button></form>
          <form action={eliminaEsercizio} onSubmit={(ev) => { if (!confirm(`Eliminare "${e.titolo}"?`)) ev.preventDefault(); }}>
            <input type="hidden" name="id" value={e.id} />
            <button className="rounded-lg border border-linea bg-white px-3 py-2 text-sm font-semibold text-rosso hover:border-rosso">Elimina</button></form>
        </div>
      </div>
      <input className="campo font-display text-2xl font-bold" aria-label="Titolo" value={e.titolo} onChange={(x) => cambia({ titolo: x.target.value })} />
      {origine && <p className="text-sm text-grigio">Nato da <Link href={`/esercitazioni/${origine.id}`} className="font-semibold text-blu">{origine.titolo}</Link>
        {origine.autore ? ` di ${origine.autore}` : ''}</p>}

      <section className="grid gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-2">
        <label><span className={etichetta}>Tipo di esercitazione</span>
          <select className="campo" value={e.tipo ?? ''} onChange={(x) => cambia({ tipo: x.target.value || null })}>
            <option value="">—</option>{TIPI.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
        <label><span className={etichetta}>Giorno della settimana (morfociclo)</span>
          <select className="campo" value={e.morfociclo ?? ''} onChange={(x) => cambia({ morfociclo: x.target.value || null })}>
            <option value="">—</option>{MORFOCICLO.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
        <label><span className={etichetta}>Fase di gioco</span>
          <select className="campo" value={e.fase ?? ''} onChange={(x) => cambia({ fase: x.target.value || null })}>
            <option value="">—</option>{FASI.map((t) => <option key={t.k} value={t.k}>{t.l}</option>)}</select></label>
        <label><span className={etichetta}>Principio</span>
          <input className="campo" list="principi" value={e.principio ?? ''} onChange={(x) => cambia({ principio: x.target.value || null })} placeholder="Es. Costruzione dal basso" />
          <datalist id="principi">{(fase?.principi ?? FASI.flatMap((f) => [...f.principi])).map((p) => <option key={p} value={p} />)}</datalist></label>
        <label className="sm:col-span-2"><span className={etichetta}>Obiettivo</span>
          <input className="campo" value={e.obiettivo ?? ''} onChange={(x) => cambia({ obiettivo: x.target.value || null })} placeholder="Es. attirare la prima pressione e liberare l'esterno" /></label>
        <fieldset className="sm:col-span-2"><legend className={etichetta}>Categorie</legend>
          <div className="flex flex-wrap gap-1.5">{CATEGORIE.map((c) => {
            const si = e.categorie.includes(c);
            return <button key={c} type="button" aria-pressed={si} onClick={() => cambia({ categorie: si ? e.categorie.filter((x) => x !== c) : [...e.categorie, c] }, 300)}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${si ? 'border-blu bg-blu text-white' : 'border-linea bg-white'}`}>{c.replace('Under ', 'U')}</button>;
          })}</div></fieldset>
      </section>

      <section className="grid gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-4">
        <label className="sm:col-span-2"><span className={etichetta}>Formato</span>
          <input className="campo" value={e.formato ?? ''} onChange={(x) => cambia({ formato: x.target.value || null })} placeholder="Es. 4c4+2 jolly" /></label>
        <label><span className={etichetta}>Lunghezza (m)</span><input className="campo" inputMode="decimal" value={e.lunghezza ?? ''} onChange={(x) => misura('lunghezza', numero(x.target.value))} /></label>
        <label><span className={etichetta}>Larghezza (m)</span><input className="campo" inputMode="decimal" value={e.larghezza ?? ''} onChange={(x) => misura('larghezza', numero(x.target.value))} /></label>
        <label><span className={etichetta}>Di movimento</span><input className="campo" inputMode="numeric" value={e.movimento ?? ''} onChange={(x) => cambia({ movimento: numero(x.target.value) })} /></label>
        <label><span className={etichetta}>Jolly / sponde</span><input className="campo" inputMode="numeric" value={e.jolly} onChange={(x) => cambia({ jolly: numero(x.target.value) ?? 0 })} /></label>
        <label><span className={etichetta}>Portieri</span><input className="campo" inputMode="numeric" value={e.portieri} onChange={(x) => cambia({ portieri: numero(x.target.value) ?? 0 })} /></label>
        <div className="rounded-lg bg-carta p-2 text-sm" aria-live="polite">
          <b className="block font-display text-2xl">{app ? `${app} m²` : '—'}</b>Area per giocatore
          {fascia && <span className="block text-grigio">{fascia.l}: {fascia.effetto}</span>}
        </div>
        <label><span className={etichetta}>Serie</span><input className="campo" inputMode="numeric" value={e.serie ?? ''} onChange={(x) => cambia({ serie: numero(x.target.value) })} /></label>
        <label><span className={etichetta}>Minuti per serie</span><input className="campo" inputMode="decimal" value={e.minuti ?? ''} onChange={(x) => cambia({ minuti: numero(x.target.value) })} /></label>
        <label><span className={etichetta}>Recupero (min)</span><input className="campo" inputMode="decimal" value={e.recupero ?? ''} onChange={(x) => cambia({ recupero: numero(x.target.value) })} /></label>
        <div className="rounded-lg bg-carta p-2 text-sm"><b className="block font-display text-2xl">{durata ? `${durata}′` : '—'}</b>Durata totale</div>
      </section>

      <section className="space-y-2 rounded-xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Lavagna</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Strumenti della lavagna">
          {STRUMENTI.map((s) => (
            <button key={s.k} type="button" aria-pressed={strumento === s.k} onClick={() => setStrumento(s.k)}
              className={`rounded-lg border px-2.5 py-1 text-sm font-semibold ${strumento === s.k ? 'border-blu bg-blu text-white' : 'border-linea bg-white'}`}>{s.l}</button>
          ))}
        </div>
        <p className="text-sm text-grigio">{strumento === 'sposta' ? 'Trascina gli elementi; tocca un elemento, una freccia o una zona per sceglierli.'
          : ['passaggio', 'corsa', 'dribbling', 'zona'].includes(strumento) ? 'Trascina sul campo per disegnare.' : 'Tocca il campo per aggiungere.'}</p>
        <Lavagna dati={e.lavagna} lunghezza={e.lunghezza ?? 30} larghezza={e.larghezza ?? 20} onCambia={lavagna} strumento={strumento} scelto={scelto} onScegli={setScelto} />
        {scelto && (
          <div className="flex flex-wrap items-end gap-2 rounded-lg bg-carta p-2">
            {el?.tipo === 'giocatore' && (
              <label className="w-24"><span className={etichetta}>Numero</span>
                <input className="campo" value={el.n ?? ''} maxLength={3}
                  onChange={(x) => lavagna({ ...e.lavagna, elementi: (e.lavagna.elementi ?? []).map((y) => (y.id === el.id ? { ...y, n: x.target.value } : y)) })} /></label>
            )}
            <button type="button" className="rounded-lg border border-linea bg-white px-3 py-2 text-sm font-semibold text-rosso" onClick={togli}>Togli</button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-semibold text-grigio" onClick={() => setScelto(null)}>Fatto</button>
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-xl border border-linea bg-white p-4">
        <label><span className={etichetta}>Descrizione e regole</span>
          <textarea className="campo" rows={4} value={e.descrizione ?? ''} onChange={(x) => cambia({ descrizione: x.target.value || null })} /></label>
        <label><span className={etichetta}>Varianti e progressioni</span>
          <textarea className="campo" rows={3} value={e.varianti ?? ''} onChange={(x) => cambia({ varianti: x.target.value || null })} /></label>
        <label><span className={etichetta}>Punti d&apos;attenzione per il mister</span>
          <textarea className="campo" rows={3} value={e.attenzione ?? ''} onChange={(x) => cambia({ attenzione: x.target.value || null })} /></label>
      </section>
      {stato && <p role="status" className="fixed bottom-4 left-1/2 z-30 -translate-x-1/2 rounded-full bg-inchiostro px-4 py-2 text-sm font-semibold text-white shadow-lg">{stato}</p>}
    </div>
  );
}
