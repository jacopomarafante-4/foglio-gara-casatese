'use client';
// Vista a giornata (come Google Calendar): una colonna per calendario (Merate, Cernusco, Trasferta), ore in verticale,
// partite accavallate affiancate. Si parte dal giorno della prossima partita della propria squadra. Tocca una partita per
// i dettagli (e la modifica, se permessa): `dettaglio` la disegna sotto.
import { useState } from 'react';
import { CALENDARI, type Calendario } from '@/lib/condivisi';
import { calendario, siglaSquadra, type Impegno } from '@/lib/programma';
import { corsie, durataPartita, giornoLungo, minuti } from '@/lib/calendario-portale';

const ORA = 56;   // pixel per ora
const chiave = (m: Impegno) => `${m.team?.id ?? 'ev'}|${m.id}`;

export function VistaGiorno({ ms, mia, dettaglio }: { ms: Impegno[]; mia: string | null; dettaglio: (m: Impegno) => React.ReactNode }) {
  const giorni = [...new Set(ms.map((m) => m.date).filter(Boolean) as string[])].sort();
  const prossima = ms.find((m) => mia && m.team?.id === mia && m.date);
  const [scelto, setScelto] = useState<string | null>(null);
  const [aperta, setAperta] = useState<string | null>(null);
  const oggi = scelto && giorni.includes(scelto) ? scelto : prossima?.date ?? giorni[0];
  const i = giorni.indexOf(oggi), delGiorno = ms.filter((m) => m.date === oggi);
  const conOra = delGiorno.filter((m) => /^\d{1,2}:\d{2}$/.test(m.time || '')), senzaOra = delGiorno.filter((m) => !conOra.includes(m));
  const blocchi = conOra.map((m) => ({ m, cal: calendario(m), inizio: minuti(m.time), fine: minuti(m.time) + durataPartita(m) }));
  const h0 = Math.min(...blocchi.map((e) => Math.floor(e.inizio / 60)), 9), h1 = Math.max(...blocchi.map((e) => Math.ceil(e.fine / 60)), h0 + 4);
  const px = (min: number) => ((min - h0 * 60) / 60) * ORA;
  const vai = (d?: string) => { if (d) { setScelto(d); setAperta(null); } };
  const scelta = delGiorno.find((m) => chiave(m) === aperta);

  if (!giorni.length) return null;
  return (
    <div>
      <div className="my-2 flex items-center justify-between gap-2">
        <button className="min-h-11 min-w-11 rounded-md text-2xl disabled:opacity-30" aria-label="Giorno prima" disabled={i <= 0} onClick={() => vai(giorni[i - 1])}>‹</button>
        <b className="text-center font-display text-xl capitalize">{giornoLungo(oggi)}</b>
        <button className="min-h-11 min-w-11 rounded-md text-2xl disabled:opacity-30" aria-label="Giorno dopo" disabled={i >= giorni.length - 1} onClick={() => vai(giorni[i + 1])}>›</button>
      </div>
      {senzaOra.length > 0 && (
        <p className="mb-2 text-sm text-grigio">Ora da definire:{' '}
          {senzaOra.map((m) => (
            <span key={chiave(m)} className="my-0.5 mr-1.5 inline-block rounded-lg border-l-4 bg-carta px-2 py-0.5 text-inchiostro" style={{ borderColor: CALENDARI[calendario(m)].colore }}>
              {m.evento ? m.opponent : `${siglaSquadra(m.team)} · ${m.opponent || ''}`}
            </span>
          ))}
        </p>
      )}
      <div className="overflow-hidden rounded-xl border border-linea bg-white">
        <div className="grid grid-cols-[44px_repeat(3,1fr)]">
          <span />
          {(Object.keys(CALENDARI) as Calendario[]).map((k) => (
            <span key={k} className="border-b-[3px] border-l border-l-linea px-1 py-2 text-center font-display text-[15px] font-bold" style={{ borderBottomColor: CALENDARI[k].colore }}>{CALENDARI[k].nome}</span>
          ))}
        </div>
        <div className="relative grid grid-cols-[44px_repeat(3,1fr)]"
          style={{ height: (h1 - h0) * ORA, background: `repeating-linear-gradient(to bottom, var(--color-linea) 0 1px, transparent 1px ${ORA}px)` }}>
          <div className="relative">
            {Array.from({ length: h1 - h0 }, (_, k) => (
              <span key={k} className={`absolute right-1 bg-white px-0.5 text-[11px] font-semibold text-grigio ${k ? '-translate-y-1/2' : ''}`} style={{ top: k * ORA }}>
                {String(h0 + k).padStart(2, '0')}:00
              </span>
            ))}
          </div>
          {(Object.keys(CALENDARI) as Calendario[]).map((k) => (
            <div key={k} className="relative border-l border-linea">
              {corsie(blocchi.filter((e) => e.cal === k)).map((e) => {
                const m = e.m, sua = !!mia && m.team?.id === mia, sel = chiave(m) === aperta;
                return (
                  <button key={chiave(m)} onClick={() => setAperta(sel ? null : chiave(m))}
                    title={`${m.time} ${m.evento ? m.opponent : siglaSquadra(m.team) + ' · ' + (m.opponent || '')}${m.venue ? ' · ' + m.venue : ''}`}
                    className={`absolute ml-0.5 flex flex-col gap-px overflow-hidden rounded-md px-1.5 py-[3px] text-left text-[11px] leading-tight ${k === 'cernusco' ? 'text-[#2B2205]' : 'text-white'} ${sua ? 'z-[1] ring-2 ring-inchiostro' : ''} ${sel ? 'z-[2] outline-[3px] outline-offset-2 outline-dashed outline-inchiostro' : ''}`}
                    style={{ background: CALENDARI[k].colore, top: px(e.inizio), height: px(e.fine) - px(e.inizio) - 2, left: `calc(${e.corsia}/${e.corsie}*100%)`, width: `calc(100%/${e.corsie} - 3px)`,
                      backgroundImage: m.evento ? 'repeating-linear-gradient(135deg,rgba(255,255,255,.18) 0 6px,transparent 6px 12px)' : undefined }}>
                    <b className="text-xs">{m.evento ? '📣 ' + m.opponent : `${siglaSquadra(m.team)} · ${m.opponent || 'Avversario'}`}</b>
                    <span className="opacity-90">{(m.time || '').padStart(5, '0')}{k === 'trasferta' && m.venue ? ' · ' + m.venue : ''}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
      {scelta && <div className="mt-2.5 rounded-xl border border-linea bg-white px-2.5">{dettaglio(scelta)}</div>}
      <p className="mt-2 text-sm text-grigio">Tocca una partita per i dettagli. Durata dei blocchi indicativa: si conosce l’ora d’inizio della partita.</p>
    </div>
  );
}
