'use client';
// Scouting → Giocatori dei mister (tappa 3; era viewGiocatori nel Portale): gli osservati dell'annata della squadra (i
// preparatori: i portieri di tutte le annate) da coach_giocatori, con segnalazioni e valutazioni; mai contatti né note.
// Filtri per stato e ruolo, ricerca per nome o società, gruppi per stato; dal dettaglio si apre la valutazione.
import { useState } from 'react';
import Link from 'next/link';
import { GIUDIZI, IMPRESSIONI, RUOLI_CAMPO, STATI, type Giudizio, type StatoGiocatore } from '@/lib/tipi';
import { CHIAVI_AREE, mediaVoti, SOGLIA_VALUTAZIONI, type FirmaValutazione } from '@/lib/valutazioni';
import { dataBreve, normalizza } from '@/lib/utili';
import { Autore, SlotValutazioni } from '@/components/Autore';
import type { GiocatoreMister, SegnalazioneMister, ValutazioneMister } from '@/lib/scouting-mister';

const ORDINE_STATI = Object.keys(STATI) as StatoGiocatore[];
const SIGLE: Record<string, string> = { portiere: 'POR', difensore: 'DIF', centrocampista: 'CEN', attaccante: 'ATT', movimento: 'MOV' };
const NOMI_AREE: Record<string, string> = { tecnica: 'Tecnica', motoria: 'Motoria', tattica: 'Tattica', mentale: 'Mentale' };
const PALLINO: Record<string, string> = {
  in_lista: 'bg-grigio', in_osservazione: 'bg-blu', da_rivedere: 'bg-oro', inserito: 'bg-blu-scuro', da_non_inserire: 'bg-rosso',
};
const TONO_GIUDIZIO: Record<string, string> = {
  da_prendere: 'bg-blu text-white', da_rivedere: 'bg-oro text-inchiostro', non_a_livello: 'bg-rosso text-white',
};
/** colore del voto 1–5, dal rosso al blu */
const TONO_VOTO = ['', 'bg-rosso text-white', 'bg-rosso/60 text-white', 'bg-oro text-inchiostro', 'bg-blu/70 text-white', 'bg-blu text-white'];

/** Chi firma, come firma() dello Scouting: account = nome e cognome, mister = "Mister <nome> · <categoria>" */
function firmaDi(autore: string | null): FirmaValutazione {
  if (!autore) return { chiave: '?', nome: 'Autore non disponibile', mister: false };
  const mister = autore.includes('·');
  const nome = mister && !/^mister\b/i.test(autore) ? `Mister ${autore}` : autore;
  return { chiave: (mister ? 'm:' : '') + autore, nome, mister };
}
const valutatori = (v: ValutazioneMister[]) => v.map((x) => firmaDi(x.autore)).filter((f, i, a) => f.chiave === '?' || a.findIndex((y) => y.chiave === f.chiave) === i);

export function GiocatoriMister({ giocatori, portieri }: { giocatori: GiocatoreMister[]; portieri: boolean }) {
  const [cerca, setCerca] = useState('');
  const [stato, setStato] = useState('');
  const [ruolo, setRuolo] = useState('');
  const q = normalizza(cerca);
  const cercati = giocatori.filter((g) => !q || normalizza([g.cognome, g.nome, g.descrizione, g.societa].filter(Boolean).join(' ')).includes(q));
  const perRuolo = cercati.filter((g) => !ruolo || (ruolo === '-' ? !g.ruolo : g.ruolo === ruolo));
  const lista = perRuolo.filter((g) => !stato || g.stato === stato);
  const gruppi = [...ORDINE_STATI, ...new Set(lista.map((g) => g.stato).filter((s) => !(s in STATI)))]
    .map((k) => ({ k, gs: lista.filter((g) => g.stato === k) })).filter((x) => x.gs.length);

  const chip = (on: boolean, clic: () => void, testo: React.ReactNode, n: number, k: string) => (
    <button key={k} type="button" onClick={clic} aria-pressed={on}
      className={`inline-flex min-h-9 flex-none items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${on ? 'border-blu bg-blu text-white' : 'border-linea bg-white hover:border-blu'}`}>
      {testo} <span className={on ? 'text-white/80' : 'text-grigio'}>{n}</span>
    </button>
  );
  const ruoli = Object.keys(SIGLE).filter((k) => cercati.some((g) => g.ruolo === k));

  return (
    <div className="space-y-3">
      <input type="search" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca per nome o società"
        aria-label="Cerca giocatore" className="campo" />
      <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Stato">
        {chip(!stato, () => setStato(''), 'Tutti', perRuolo.length, 'tutti')}
        {ORDINE_STATI.filter((k) => perRuolo.some((g) => g.stato === k)).map((k) =>
          chip(stato === k, () => setStato(stato === k ? '' : k), <><i className={`inline-block size-2.5 rounded-full ${PALLINO[k]}`} />{STATI[k]}</>,
            perRuolo.filter((g) => g.stato === k).length, k))}
      </div>
      {!portieri && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none]" role="group" aria-label="Ruolo">
          {chip(!ruolo, () => setRuolo(''), 'Tutti i ruoli', cercati.length, 'tutti')}
          {ruoli.map((k) => chip(ruolo === k, () => setRuolo(ruolo === k ? '' : k), RUOLI_CAMPO[k as keyof typeof RUOLI_CAMPO],
            cercati.filter((g) => g.ruolo === k).length, k))}
          {cercati.some((g) => !g.ruolo) && chip(ruolo === '-', () => setRuolo(ruolo === '-' ? '' : '-'), 'Ruolo da definire',
            cercati.filter((g) => !g.ruolo).length, '-')}
        </div>
      )}

      {!lista.length && <p className="rounded-xl border border-linea bg-white p-4 text-grigio">Nessun giocatore con questi filtri.</p>}
      {gruppi.map(({ k, gs }) => (
        <section key={k} className="space-y-2">
          <h2 className="flex items-center gap-2 pt-2 font-display text-xl font-bold">
            <i className={`inline-block size-3 rounded-full ${PALLINO[k] ?? 'bg-grigio'}`} />{STATI[k as StatoGiocatore] ?? k}
            <span className="text-base font-semibold text-grigio">{gs.length}</span>
          </h2>
          {gs.map((g) => <Riga key={g.id} g={g} portieri={portieri} />)}
        </section>
      ))}
    </div>
  );
}

function Riga({ g, portieri }: { g: GiocatoreMister; portieri: boolean }) {
  const nome = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome';
  const ultima = g.valutazioni[0];
  // ultima segnalazione o valutazione con voti per area
  const voti = [...g.segnalazioni, ...g.valutazioni].filter((x) => mediaVoti(x) !== null).sort((a, b) => b.data.localeCompare(a.data))[0];
  const media = voti ? mediaVoti(voti) : null;
  const agg = [ultima?.data, g.segnalazioni[0]?.data].filter(Boolean).sort().pop();
  const info = [portieri ? String(g.annata) : '', g.societa, agg ? 'agg. ' + dataBreve(agg) : ''].filter(Boolean).join(' · ');
  const firme = valutatori(g.valutazioni);
  return (
    <details className={`group rounded-xl border bg-white ${firme.length >= SOGLIA_VALUTAZIONI ? 'border-verde' : 'border-linea'}`}>
      <summary className="flex cursor-pointer list-none flex-col gap-2 p-3 [&::-webkit-details-marker]:hidden">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <b className="font-display text-lg">{nome}</b>
              {g.ruolo && <span className="rounded bg-linea px-1.5 py-0.5 text-xs font-bold">{SIGLE[g.ruolo] ?? g.ruolo}</span>}
            </div>
            <div className="text-sm text-grigio">{info || ' '}</div>
          </div>
          <div className={`flex size-12 flex-none flex-col items-center justify-center rounded-lg font-display text-lg font-bold leading-none ${
            media == null ? 'bg-linea/60 text-grigio' : TONO_VOTO[Math.round(media)]}`} title="Media dei voti per area (ultima segnalazione o valutazione)">
            <small className="mb-0.5 font-sans text-[10px] font-semibold uppercase opacity-80">Media</small>{media == null ? '–' : media.toFixed(1)}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {CHIAVI_AREE.map((k) => {
            const v = voti?.[k];
            return (
              <span key={k} className={`flex w-11 flex-col items-center rounded-md py-0.5 text-xs ${typeof v === 'number' ? TONO_VOTO[v] : 'bg-linea/50 text-grigio'}`}>
                <small className="text-[9px] font-semibold uppercase opacity-80">{NOMI_AREE[k].slice(0, 3)}</small><b>{v ?? '–'}</b>
              </span>
            );
          })}
          <span className="flex w-11 flex-col items-center rounded-md bg-linea/50 py-0.5 text-xs">
            <small className="text-[9px] font-semibold uppercase text-grigio">Segn</small><b>{g.segnalazioni.length || '–'}</b>
          </span>
          {ultima
            ? <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TONO_GIUDIZIO[ultima.giudizio] ?? 'bg-linea'}`}>{GIUDIZI[ultima.giudizio as Giudizio] ?? ultima.giudizio}</span>
            : <span className="rounded-full border border-dashed border-linea px-2.5 py-1 text-xs font-semibold text-grigio">Da valutare</span>}
          <SlotValutazioni firme={firme} piccolo />
        </div>
      </summary>
      <div className="space-y-3 border-t border-linea p-3">
        {g.descrizione && g.cognome && <p className="text-sm text-grigio">{g.descrizione}</p>}
        {g.piede && <p className="text-sm text-grigio">Piede {g.piede}{g.categoria ? ' · ' + g.categoria : ''}</p>}
        <Link href={`/scouting/valuta/${g.id}`} className="bottone inline-block px-4 py-2 text-sm">Valuta</Link>
        {g.valutazioni.map((v, i) => (
          <Voce key={'v' + i} testa={<><Autore f={firmaDi(v.autore)} piccolo /> {dataBreve(v.data)}{v.contesto ? ' · ' + v.contesto : ''}{v.autore ? ' · ' + firmaDi(v.autore).nome : ''}</>} r={v}>
            <span className={`mr-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${TONO_GIUDIZIO[v.giudizio] ?? 'bg-linea'}`}>{GIUDIZI[v.giudizio as Giudizio] ?? v.giudizio}</span>
            {v.commento}
          </Voce>
        ))}
        {g.segnalazioni.map((x, i) => (
          <Voce key={'s' + i} segnalazione r={x} testa={<>Segnalazione · {dataBreve(x.data)}{x.contesto ? ' · ' + x.contesto : ''}{x.autore ? ' · ' + x.autore : ''}
            {x.impressione ? <b> · {IMPRESSIONI[x.impressione as keyof typeof IMPRESSIONI] ?? ''}</b> : x.voto ? <b> · {x.voto}/5</b> : null}</>}>
            {x.testo}
          </Voce>
        ))}
        {!g.valutazioni.length && !g.segnalazioni.length && <p className="text-sm text-grigio">Nessuna segnalazione o valutazione.</p>}
      </div>
    </details>
  );
}

/** Una valutazione o segnalazione: intestazione, barre dei voti per area con le note, testo */
function Voce({ testa, r, segnalazione = false, children }: { testa: React.ReactNode; r: SegnalazioneMister | ValutazioneMister; segnalazione?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg p-2.5 ${segnalazione ? 'bg-carta' : 'border border-linea'}`}>
      <div className="flex flex-wrap items-center gap-1 text-sm text-grigio">{testa}</div>
      {CHIAVI_AREE.filter((k) => typeof r[k] === 'number').map((k) => (
        <div key={k} className="mt-1.5">
          <div className="grid grid-cols-[5.5rem_1fr_1.5rem] items-center gap-2 text-sm">
            <span>{NOMI_AREE[k]}</span>
            <i className="h-2 rounded-full bg-linea"><b className="block h-2 rounded-full bg-blu" style={{ width: `${(r[k] as number) * 20}%` }} /></i>
            <strong className="text-right">{r[k]}</strong>
          </div>
          {r[`${k}_note`] && <p className="ml-[6rem] text-sm text-grigio">{r[`${k}_note`]}</p>}
        </div>
      ))}
      <p className="mt-1.5 whitespace-pre-line text-sm">{children}</p>
    </div>
  );
}
