'use client';
// Squadra → Partite: Dati partita e Convocazioni (come viewPartita, viewConvocazioni, viewConvocazioniAdb del Portale).
// Tutto nel foglio della squadra (sheet/<squadra>), salvato campo per campo (useFoglio). Il PDF della convocazione si scarica
// e ne resta una copia nell'Archivio documenti. Accanto ai convocati la risposta della famiglia ("ci sarà / non ci sarà").
import '@fontsource/barlow/700.css';
import '@fontsource/barlow-condensed/700.css';
import { fmtData, giorno, type Partita } from '@/lib/programma';
import { nuovoId } from '@/lib/calendario-portale';
import { linkCampo, linkLuogo, type Campi } from '@/lib/campi';
import { numeroPartita } from '@/lib/distinta';
import {
  ETICHETTE_STATO, MAX_PARTITE_ADB, STATI_CONVOCAZIONE, TIPI_IMPEGNO, datiDaCalendario, foglioVuoto, luogoPartita, menoSettantacinque, nuovaPartitaAdb,
  ritrovo, stessaPartitaFoglio, type FoglioPartita, type PartitaAdb,
} from '@/lib/foglio';
import { creaConvocazione } from '@/lib/pdf-convocazione';
import { scarica } from '@/lib/pdf-moduli';
import { archiviaPdf } from '@/app/(aree)/modulistica/actions';
import { svuotaFoglio } from '@/app/(aree)/docs-actions';
import { Messaggio } from '@/components/calendario/salvataggio';
import { useFoglio } from './useFoglio';

type Cal = Partita & { id: string; ll?: string; friendly?: boolean };
export type Risposte = Record<string, { risposta: 'si' | 'no'; nota?: string }>;
type Base = { squadraId: string; nomeSquadra: string; categoria: string; mister: string; giocatori: { id: string; name: string }[];
  calendario: Cal[]; weekend: string[]; oggi: string; campi: Campi; foglio: FoglioPartita; soloLettura: boolean; linkCampi: string };

const etichetta = 'mb-1 block text-sm font-semibold text-grigio';
const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';
const Titolo = ({ children }: { children: React.ReactNode }) => <h3 className="mt-5 font-display text-xl font-bold">{children}</h3>;
const inOrdine = (ms: Cal[]) => ms.slice().sort((a, b) => ((a.date || '') + (a.time || '').padStart(5, '0')).localeCompare((b.date || '') + (b.time || '').padStart(5, '0')));

function RispostaFamiglia({ r }: { r?: { risposta: 'si' | 'no'; nota?: string } }) {
  if (!r) return null;
  return <span title={`Risposta della famiglia${r.nota ? ': ' + r.nota : ''}`}
    className={`ml-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold ${r.risposta === 'si' ? 'bg-verde/15 text-verde' : 'bg-rosso/10 text-rosso'}`}>
    famiglia: {r.risposta === 'si' ? 'ci sarà' : 'non ci sarà'}</span>;
}
function PartitaCalendario({ m, children }: { m: Cal; children?: React.ReactNode }) {
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-2">
      <span><b>{giorno(m.date)} {fmtData(m.date).slice(0, 5)}{m.time ? ' · ' + m.time : ''}</b> — {m.opponent || 'Avversario'}
        <span className="text-sm text-grigio">{m.home ? ' · Casa' : ' · Trasferta'}{m.friendly ? ' · amichevole' : ''}{m.venue ? ' · ' + m.venue : ''}</span></span>
      {children}
    </li>
  );
}
function CasellaCategoria({ foglio, cambia, soloLettura }: { foglio: FoglioPartita; cambia: (c: Partial<FoglioPartita>) => void; soloLettura: boolean }) {
  return (
    <label className="flex items-center gap-2">
      <input type="checkbox" className="size-5" disabled={soloLettura} checked={!foglio.senzaCategoria} onChange={(e) => cambia({ senzaCategoria: !e.target.checked })} />
      Mostra la categoria nell&apos;intestazione del PDF
    </label>
  );
}
function usaPdf(p: Base, foglio: FoglioPartita, adb: boolean, setMessaggio: (t: string) => void) {
  return async () => {
    setMessaggio('Creo la convocazione…');
    try {
      const { nome, blob } = await creaConvocazione({ foglio, nomeSquadra: foglio.team || p.nomeSquadra, categoria: foglio.senzaCategoria ? '' : (adb ? p.categoria.replace(/\s*-\s*attività di base/i, '') : foglio.category || p.categoria),
        giocatori: p.giocatori, calendario: p.calendario, campi: p.campi, mister: p.mister, adb });
      scarica(nome, blob); setMessaggio('Convocazione pronta');
      archiviaPdf(nome, 'Convocazione', blob, p.squadraId).catch(() => { /* il PDF c'è comunque */ });
    } catch { setMessaggio('Convocazione non creata: riprova'); }
  };
}

/* ---------- Dati partita (solo agonistica) ---------- */
export function DatiPartita(p: Base) {
  const { foglio, setFoglio, cambia, messaggio, setMessaggio } = useFoglio(p.squadraId, p.foglio, p.soloLettura);
  const wk = inOrdine(p.calendario.filter((m) => p.weekend.includes(m.date || '')));
  const prossima = inOrdine(p.calendario.filter((m) => m.date && m.date >= p.oggi))[0];
  const campo = (k: keyof FoglioPartita, l: string, tipo = 'text') => (
    <label><span className={etichetta}>{l}</span><input type={tipo} className="campo" readOnly={p.soloLettura} value={String(foglio[k] ?? '')} onChange={(e) => cambia({ [k]: e.target.value })} /></label>
  );
  const giocatore = (k: 'captain' | 'vice', l: string) => (
    <label><span className={etichetta}>{l}</span>
      <select className="campo" disabled={p.soloLettura} value={String(foglio[k] ?? '')} onChange={(e) => cambia({ [k]: e.target.value })}>
        <option value="">Nessuno</option>
        {p.giocatori.map((g) => { const n = numeroPartita(foglio as never, g.id); return <option key={g.id} value={g.id}>{(n ? n + ' ' : '') + g.name}</option>; })}
      </select></label>
  );
  async function nuovaPartita() {
    if (!confirm('Svuotare formazione, panchina, convocazioni e dati partita? Rosa e schemi restano.')) return;
    const vuoto = foglioVuoto();
    setFoglio({ ...vuoto, selected: foglio.selected ?? [] });
    const r = await svuotaFoglio(p.squadraId, vuoto).catch(() => ({ ok: false, errore: 'rete assente' }));
    setMessaggio(r.ok ? 'Foglio svuotato' : `Non salvato: ${r.errore ?? 'riprova'}`);
  }
  return (
    <div className="space-y-3">
      {wk.length > 0 ? (
        <div className="rounded-xl border border-linea bg-white p-3">
          <p className="text-sm text-grigio">Partite del weekend · sab {fmtData(p.weekend[0]).slice(0, 5)} e dom {fmtData(p.weekend[1]).slice(0, 5)}</p>
          <ul className="divide-y divide-linea">{wk.map((m) => (
            <PartitaCalendario key={m.id} m={m}>{stessaPartitaFoglio(foglio, m) ? <span className="text-sm font-semibold text-verde">✓ Nel foglio gara</span>
              : !p.soloLettura && <button className="bottone px-3 py-1.5 text-sm" onClick={() => cambia(datiDaCalendario(m), 0)}>Usa questa</button>}</PartitaCalendario>))}</ul>
          <p className="text-sm text-grigio">Scegli la partita da preparare, oppure scrivi qui sotto i dati di un’altra partita (amichevole, recupero, ecc.).</p>
        </div>
      ) : prossima && (
        <div className="rounded-xl border border-linea bg-white p-3">
          <p className="text-sm text-grigio">Nessuna partita questo weekend · prossima in calendario</p>
          <ul><PartitaCalendario m={prossima}>{!p.soloLettura && <button className="bottone px-3 py-1.5 text-sm" onClick={() => cambia(datiDaCalendario(prossima), 0)}>Usa questa</button>}</PartitaCalendario></ul>
          <p className="text-sm text-grigio">Oppure ignora e scrivi qui sotto i dati di un’altra partita (amichevole, recupero, ecc.).</p>
        </div>
      )}
      <p className="text-grigio">Questi dati finiscono nell’intestazione di ogni pagina del PDF. Il calendario delle partite è nell’area Calendario.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {campo('team', 'La nostra squadra (nel PDF)')}{campo('opponent', 'Avversario')}
        {campo('date', 'Data', 'date')}{campo('time', 'Ora', 'time')}
        {campo('venue', 'Campo')}{campo('category', 'Categoria')}
        {giocatore('captain', 'Capitano')}{giocatore('vice', 'Vice capitano')}
      </div>
      <label className="block"><span className={etichetta}>Note per la squadra</span>
        <textarea className="campo" rows={3} readOnly={p.soloLettura} value={foglio.notes ?? ''} onChange={(e) => cambia({ notes: e.target.value })} /></label>
      {!p.soloLettura && <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={nuovaPartita}>Nuova partita (svuota formazione e dati)</button>}
      <Messaggio testo={messaggio} />
    </div>
  );
}

/* ---------- Convocazioni (agonistica) ---------- */
export function Convocazioni(p: Base & { risposte: Risposte }) {
  const { foglio, cambia, messaggio, setMessaggio } = useFoglio(p.squadraId, p.foglio, p.soloLettura);
  const prossima = inOrdine(p.calendario.filter((m) => m.date && m.date >= p.oggi))[0];
  const callup = foglio.callup ?? {}, chiave = `${foglio.date}|${foglio.opponent}`;
  const luogo = luogoPartita(foglio, p.calendario), urlLuogo = linkLuogo(p.campi, luogo);
  const urlRitrovo = (foglio.meetAddress || '').trim() ? linkCampo(p.campi, foglio.meetAddress) : urlLuogo;
  const conta = Object.fromEntries(STATI_CONVOCAZIONE.map((st) => [st, p.giocatori.filter((g) => callup[g.id] === st).length]));
  const svuota = () => { if (confirm('Svuotare lo stato di tutti i giocatori e i dati del ritrovo per questa partita?')) cambia({ callup: {}, meetTime: '', meetAddress: '', convNotes: '', convType: 'Campionato' }, 0); };
  return (
    <div className="space-y-3">
      <CasellaCategoria foglio={foglio} cambia={cambia} soloLettura={p.soloLettura} />
      {prossima && !stessaPartitaFoglio(foglio, prossima) && (
        <div className="rounded-xl border border-linea bg-white p-3">
          <p className="text-sm text-grigio">Prossima in calendario</p>
          <ul><PartitaCalendario m={prossima}>{!p.soloLettura && <button className="bottone px-3 py-1.5 text-sm" onClick={() => cambia(datiDaCalendario(prossima), 0)}>Usa questa</button>}</PartitaCalendario></ul>
          <p className="text-sm text-grigio">Oppure ignora e compila tu i campi qui sotto per un’altra partita (amichevole, recupero, ecc.).</p>
        </div>
      )}
      <p className="text-grigio">Questi dati finiscono nel foglio convocazione (PDF separato dal foglio gara), da mandare a giocatori e famiglie.</p>
      <div className="rounded-xl border border-linea bg-white p-3">
        <b className="font-display text-lg">{foglio.home ? `${foglio.team || p.nomeSquadra} - ${foglio.opponent || 'Avversario'}` : `${foglio.opponent || 'Avversario'} - ${foglio.team || p.nomeSquadra}`}</b>
        <p className="text-sm text-grigio">{[foglio.date && `${giorno(foglio.date)} ${fmtData(foglio.date)}`, foglio.time && 'ore ' + foglio.time].filter(Boolean).join(' · ') || 'Partita non indicata: scegli “Usa questa” o compila Dati partita.'}</p>
      </div>

      <Titolo>Impegno</Titolo>
      <div className="grid grid-cols-2 gap-3">
        <label><span className={etichetta}>Tipo</span><select className="campo" disabled={p.soloLettura} value={foglio.convType || 'Campionato'} onChange={(e) => cambia({ convType: e.target.value })}>
          {TIPI_IMPEGNO.map((t) => <option key={t}>{t}</option>)}</select></label>
        <label><span className={etichetta}>Sede</span><select className="campo" disabled={p.soloLettura} value={foglio.home ? '1' : ''} onChange={(e) => cambia({ home: !!e.target.value })}>
          <option value="1">Casa</option><option value="">Trasferta</option></select></label>
      </div>

      <Titolo>Campo di gioco</Titolo>
      {luogo.venue ? (
        <div className="flex items-start justify-between gap-2 rounded-xl border border-linea bg-white p-3">
          <span><b>{luogo.venue}</b>{luogo.address && <><br /><span className="text-sm text-grigio">{luogo.address}</span></>}</span>
          <span className="flex shrink-0 gap-1.5">
            {urlLuogo && <a className="rounded-lg border border-linea px-2 py-1" href={urlLuogo} target="_blank" rel="noopener noreferrer" title="Apri in Google Maps">📍</a>}
            <a className="rounded-lg border border-linea px-2 py-1" href={p.linkCampi} title="Imposta la posizione esatta del campo">📌</a>
          </span>
        </div>
      ) : <p className="text-sm text-grigio">Campo non indicato: scrivilo nel calendario della squadra.</p>}
      {luogo.venue && <p className="text-sm text-grigio">Come scritto nel calendario ufficiale o nell’ultimo comunicato: si aggiorna da solo.</p>}

      <Titolo>Ritrovo</Titolo>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label><span className={etichetta}>Orario</span><input type="time" className="campo" readOnly={p.soloLettura} value={ritrovo(foglio)} onChange={(e) => cambia({ meetTime: e.target.value })} /></label>
        <label><span className={etichetta}>Indirizzo del ritrovo</span>
          <span className="flex gap-2"><input className="campo" readOnly={p.soloLettura} placeholder="Al campo di gioco (scrivi solo se è altrove)" value={foglio.meetAddress ?? ''} onChange={(e) => cambia({ meetAddress: e.target.value })} />
            {urlRitrovo && <a className="self-center rounded-lg border border-linea px-2 py-1" href={urlRitrovo} target="_blank" rel="noopener noreferrer" title="Apri in Google Maps">📍</a>}</span></label>
      </div>
      <label className="block"><span className={etichetta}>Note</span><textarea className="campo" rows={3} readOnly={p.soloLettura} value={foglio.convNotes ?? ''} onChange={(e) => cambia({ convNotes: e.target.value })} /></label>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-display text-xl font-bold">Giocatori</h3>
        <div className="flex flex-wrap gap-1 text-xs">{STATI_CONVOCAZIONE.map((st) => <span key={st} className="rounded-full bg-carta px-2 py-1"><b>{conta[st]}</b> {st}</span>)}</div>
      </div>
      <p className="text-sm text-grigio">Ordine alfabetico. Tocca lo stato per ciascun giocatore: <b>CON</b> convocato · <b>NC</b> non convocato · <b>INF</b> infortunato · <b>SQL</b> squalificato · <b>ND</b> non disponibile.</p>
      <ul className="space-y-1.5">
        {p.giocatori.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-linea bg-white p-2">
            <span className="min-w-0 font-semibold">{g.name}<RispostaFamiglia r={p.risposte[`${g.id}|${chiave}`]} /></span>
            <span className="inline-flex overflow-hidden rounded-lg border border-linea" role="group" aria-label={`Stato convocazione ${g.name}`}>
              {STATI_CONVOCAZIONE.map((st) => (
                <button key={st} disabled={p.soloLettura} aria-pressed={callup[g.id] === st} title={ETICHETTE_STATO[st]}
                  onClick={() => cambia({ callup: { ...callup, [g.id]: callup[g.id] === st ? '' : st } })}
                  className={`px-2.5 py-1.5 text-xs font-bold ${callup[g.id] === st ? (st === 'CON' ? 'bg-verde text-white' : st === 'NC' ? 'bg-grigio text-white' : st === 'ND' ? 'bg-oro text-inchiostro' : st === 'SQL' ? 'bg-inchiostro text-white' : 'bg-rosso text-white') : 'bg-white'}`}>{st}</button>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button className="bottone" onClick={usaPdf(p, foglio, false, setMessaggio)}>Scarica convocazione PDF</button>
        {!p.soloLettura && <button className={`${piccolo} border-transparent text-rosso hover:bg-rosso/5`} onClick={svuota}>Svuota convocazioni</button>}
      </div>
      <Messaggio testo={messaggio} />
    </div>
  );
}

/* ---------- Convocazioni (attività di base): da 1 a 4 partite, ognuna con i suoi convocati ---------- */
export function ConvocazioniAdb(p: Base & { risposte: Risposte }) {
  const { foglio, cambia, messaggio, setMessaggio } = useFoglio(p.squadraId, p.foglio, p.soloLettura);
  const pp = foglio.adb?.partite ?? [];
  const salvaPartite = (nuove: PartitaAdb[], attesa?: number) => cambia({ adb: { ...(foglio.adb ?? {}), partite: nuove } }, attesa);
  const cambiaPartita = (i: number, campi: Partial<PartitaAdb>, attesa?: number) => salvaPartite(pp.map((x, j) => (j === i ? { ...x, ...campi } : x)), attesa);
  const future = inOrdine(p.calendario.filter((m) => m.date && m.date >= p.oggi));
  const wk = inOrdine(p.calendario.filter((m) => p.weekend.includes(m.date || '')));
  const usate = new Set(pp.map((x) => x.calId).filter(Boolean)), mancanti = wk.filter((m) => !usate.has(m.id));
  /* una partita vuota (senza calendario né convocati) si riempie invece di aggiungerne un'altra */
  function aggiungi(ms: Cal[]) {
    const nuove = [...pp];
    for (const m of ms) {
      if (nuove.length >= MAX_PARTITE_ADB) break;
      const vuota = nuove.findIndex((x) => !x.calId && !x.opponent && !(x.conv ?? []).length);
      if (vuota >= 0) nuove[vuota] = { ...nuovaPartitaAdb(nuove[vuota].id, m) }; else nuove.push(nuovaPartitaAdb(nuovoId('pa'), m));
    }
    salvaPartite(nuove, 0);
  }
  const campoTesto = (i: number, k: keyof PartitaAdb, l: string, tipo = 'text', ph = '') => (
    <label><span className={etichetta}>{l}</span><input type={tipo} className="campo" placeholder={ph} readOnly={p.soloLettura}
      value={String(pp[i][k] ?? '')} onChange={(e) => cambiaPartita(i, { [k]: e.target.value })} /></label>
  );
  return (
    <div className="space-y-3">
      <CasellaCategoria foglio={foglio} cambia={cambia} soloLettura={p.soloLettura} />
      <p className="text-grigio">Attività di base: da 1 a {MAX_PARTITE_ADB} partite nella stessa convocazione, ognuna con i suoi convocati. Il PDF è un foglio orizzontale con una colonna per partita.</p>
      {wk.length > 0 && (
        <div className="rounded-xl border border-linea bg-white p-3">
          <p className="text-sm text-grigio">Partite del weekend · sab {fmtData(p.weekend[0]).slice(0, 5)} e dom {fmtData(p.weekend[1]).slice(0, 5)}</p>
          <ul className="divide-y divide-linea">{wk.map((m) => (
            <PartitaCalendario key={m.id} m={m}>{usate.has(m.id) ? <span className="text-sm font-semibold text-verde">✓ Nella convocazione</span>
              : !p.soloLettura && pp.length < MAX_PARTITE_ADB && <button className="bottone px-3 py-1.5 text-sm" onClick={() => aggiungi([m])}>Aggiungi alla convocazione</button>}</PartitaCalendario>))}</ul>
          {!p.soloLettura && mancanti.length > 1 && pp.length + mancanti.length <= MAX_PARTITE_ADB && (
            <button className={`${piccolo} mt-2 border-linea bg-white hover:border-blu`} onClick={() => aggiungi(mancanti)}>Aggiungi tutte le partite del weekend</button>)}
        </div>
      )}
      {pp.length === 0 && <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">{wk.length ? 'Aggiungi una partita del weekend, qui sopra.' : 'Nessuna partita: aggiungi la prima.'}</p>}
      {pp.map((x, i) => {
        const altrove = (pid: string) => pp.some((q, j) => j !== i && (q.conv ?? []).includes(pid));
        return (
          <section key={x.id} className="space-y-3 rounded-xl border border-linea bg-white p-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-xl font-bold">Partita {i + 1}{pp.length > 1 ? ` di ${pp.length}` : ''}</h3>
              {!p.soloLettura && pp.length > 1 && <button className={`${piccolo} border-transparent text-rosso`} onClick={() => { if (confirm(`Togliere la partita ${i + 1} e i suoi convocati?`)) salvaPartite(pp.filter((_, j) => j !== i), 0); }}>Togli</button>}
            </div>
            <select className="campo" disabled={p.soloLettura} aria-label="Partita dal calendario" value={x.calId} onChange={(e) => {
              const m = p.calendario.find((c) => c.id === e.target.value);
              cambiaPartita(i, m ? { calId: m.id, date: m.date || '', time: m.time || '', opponent: m.opponent || '', home: !!m.home, venue: m.venue || '', address: m.address || '', ll: m.ll || '' } : { calId: '' }, 0);
            }}>
              <option value="">Scegli dal calendario…</option>
              {future.map((m) => <option key={m.id} value={m.id}>{giorno(m.date)} {fmtData(m.date)}{m.time ? ' ' + m.time : ''} · {m.opponent || 'Avversario'}{m.home ? ' (casa)' : ''}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-3">
              {campoTesto(i, 'date', 'Data', 'date')}{campoTesto(i, 'time', 'Inizio gara', 'time')}
              <label><span className={etichetta}>Ritrovo ore</span><input type="time" className="campo" readOnly={p.soloLettura} value={x.meetTime || menoSettantacinque(x.time) || ''} onChange={(e) => cambiaPartita(i, { meetTime: e.target.value })} /></label>
              {campoTesto(i, 'opponent', 'Avversario')}
              <label><span className={etichetta}>Sede</span><select className="campo" disabled={p.soloLettura} value={x.home ? '1' : ''} onChange={(e) => cambiaPartita(i, { home: !!e.target.value })}><option value="1">Casa</option><option value="">Trasferta</option></select></label>
              {campoTesto(i, 'mr', 'Mister presente', 'text', p.mister || 'Nome del mister')}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {campoTesto(i, 'venue', 'Campo di gioco', 'text', 'Campo e paese')}{campoTesto(i, 'address', 'Indirizzo del campo')}
              {campoTesto(i, 'meetAddress', 'Indirizzo del ritrovo', 'text', 'Al campo di gioco (solo se altrove)')}
            </div>
            <label className="block"><span className={etichetta}>Note</span><textarea className="campo" rows={2} readOnly={p.soloLettura}
              value={x.note ?? ''} onChange={(e) => cambiaPartita(i, { note: e.target.value })} /></label>
            <div className="flex items-center justify-between gap-2"><h4 className="font-display text-lg font-bold">Convocati</h4>
              <span className="rounded-full bg-verde/10 px-3 py-1 text-sm"><b>{(x.conv ?? []).length}</b> convocati</span></div>
            <p className="text-sm text-grigio">Tocca i giocatori convocati per questa partita: nel foglio compaiono solo loro.</p>
            <div className="flex flex-wrap gap-1.5">
              {p.giocatori.map((g) => { const on = (x.conv ?? []).includes(g.id);
                return (
                  <button key={g.id} disabled={p.soloLettura} aria-pressed={on} onClick={() => cambiaPartita(i, { conv: on ? x.conv.filter((c) => c !== g.id) : [...(x.conv ?? []), g.id] })}
                    className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${on ? 'border-verde bg-verde text-white' : 'border-linea bg-white'}`}>
                    {on && '✓ '}{g.name}{!on && altrove(g.id) && <small className="font-normal text-grigio"> · in altra partita</small>}
                    {on && <RispostaFamiglia r={p.risposte[`${g.id}|${x.calId || `${x.date}|${x.opponent}`}`]} />}
                  </button>
                ); })}
            </div>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {!p.soloLettura && (pp.length < MAX_PARTITE_ADB
          ? <button className={`${piccolo} border-linea bg-white hover:border-blu`} onClick={() => {
              const m = future.find((c) => !usate.has(c.id));
              salvaPartite([...pp, nuovaPartitaAdb(nuovoId('pa'), pp.length ? undefined : m)], 0);
            }}>+ Aggiungi partita</button>
          : <span className="text-sm text-grigio">Massimo 4 partite.</span>)}
        {pp.length > 0 && (
          <span className="flex gap-2">
            <button className="bottone" onClick={usaPdf(p, foglio, true, setMessaggio)}>Scarica convocazione PDF</button>
            {!p.soloLettura && <button className={`${piccolo} border-transparent text-rosso`} onClick={() => { if (confirm('Svuotare tutte le partite e i convocati?')) salvaPartite([], 0); }}>Svuota</button>}
          </span>
        )}
      </div>
      <Messaggio testo={messaggio} />
    </div>
  );
}
