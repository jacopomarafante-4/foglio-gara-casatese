'use client';
// Squadra → Partite → Campi (come viewVenues/pinBox del Portale): i campi delle partite della squadra, il link di Google Maps e la
// posizione esatta del cancello, che vale per tutte le partite su quel campo (registro.venues). Anche il mister la imposta.
import { useState } from 'react';
import { chiaveCampo, leggiCoordinate, linkCampo, type Campi } from '@/lib/campi';
import { impostaCampo } from '@/app/(aree)/docs-actions';
import { Messaggio } from '@/components/calendario/salvataggio';

const piccolo = 'rounded-lg border px-3 py-1.5 text-sm font-semibold';

export function CampiSquadra({ squadraId, campi: nomi, posizioni: iniziali, soloLettura }: { squadraId: string; campi: string[]; posizioni: Campi; soloLettura: boolean }) {
  const [posizioni, setPosizioni] = useState(iniziali);
  const [aperto, setAperto] = useState<string | null>(null);
  const [testo, setTesto] = useState('');
  const [messaggio, setMessaggio] = useState('');
  const impostati = nomi.filter((v) => posizioni[chiaveCampo(v)]).length;

  async function salva(v: string, pos: { ll?: string; url?: string } | null) {
    setMessaggio('Salvataggio…');
    const r = await impostaCampo(squadraId, v, pos).catch(() => ({ ok: false, errore: 'rete assente' }));
    if (!r.ok) { setMessaggio(`Non salvato: ${r.errore ?? 'riprova'}`); return; }
    setPosizioni((p) => { const n = { ...p }; if (pos) n[chiaveCampo(v)] = { name: v, ...pos }; else delete n[chiaveCampo(v)]; return n; });
    setAperto(null); setMessaggio(pos ? 'Posizione del campo salvata' : 'Posizione tolta');
  }
  function conferma(v: string) {
    const t = testo.trim(), ll = leggiCoordinate(t);
    if (ll) salva(v, { ll });
    else if (/^https?:\/\/\S+$/.test(t)) salva(v, { url: t });
    else setMessaggio('Coordinate non riconosciute');
  }

  if (!nomi.length) return <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun campo: i campi arrivano dalle partite del calendario.</p>;
  return (
    <div className="space-y-3">
      <p className="max-w-prose text-grigio">Con la posizione esatta salvata, il link di convocazioni e foglio convocazione porta dritto al cancello. {impostati} campi su {nomi.length} impostati.</p>
      <ul className="divide-y divide-linea rounded-xl border border-linea bg-white px-3">
        {nomi.map((v) => {
          const pos = posizioni[chiaveCampo(v)], apri = aperto === v, coord = !!leggiCoordinate(v);
          return (
            <li key={v} className="space-y-1.5 py-2.5">
              <b className="block">{v}</b>
              <a className="text-sm font-semibold text-blu" href={linkCampo(posizioni, v)} target="_blank" rel="noopener noreferrer">📍 Prova il link</a>
              {!coord && !apri && (
                <p className="text-sm">{pos ? <>📌 Posizione esatta salvata {!soloLettura && <button className="font-semibold text-blu" onClick={() => { setAperto(v); setTesto(pos.ll || pos.url || ''); }}>cambia</button>}</>
                  : !soloLettura && <button className="font-semibold text-blu" onClick={() => { setAperto(v); setTesto(''); }}>📌 Imposta la posizione esatta del campo</button>}</p>
              )}
              {apri && (
                <div className="space-y-2 rounded-lg bg-carta p-2.5">
                  <div className="flex gap-2">
                    <input className="campo" placeholder="45.6978, 9.4004" aria-label="Coordinate del cancello" value={testo} autoFocus
                      onChange={(e) => setTesto(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') conferma(v); }} />
                    <button className="bottone" onClick={() => conferma(v)}>Salva</button>
                  </div>
                  <p className="text-sm text-grigio">Su Google Maps tieni premuto sul cancello d’ingresso: in alto compaiono le coordinate, copiale qui (va bene anche il link “Condividi”). Vale per tutte le partite su questo campo.</p>
                  <div className="flex gap-2">
                    <button className={`${piccolo} border-linea bg-white`} onClick={() => setAperto(null)}>Annulla</button>
                    {pos && <button className={`${piccolo} border-transparent text-rosso`} onClick={() => salva(v, null)}>Togli posizione</button>}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <Messaggio testo={messaggio} />
    </div>
  );
}
