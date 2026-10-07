'use client';
// Calendario → La mia squadra: un solo elenco delle partite da giocare (campionato, amichevoli, tornei, eventi della
// squadra), ognuna con la sua etichetta; le giocate nello Storico in fondo. Si modificano dalla riga: le amichevoli
// segnate dalla squadra (registro/<squadra>.friendlies) il mister e l'admin, le partite ufficiali (calendar/<squadra>)
// solo l'admin. I direttori sono in sola lettura.
// Preparatori dei portieri: le partite delle categorie dei loro portieri, con sotto i portieri e la convocazione.
import { useState } from 'react';
import { eventoCome, siglaSquadra, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import { daGiocare, inOrdine, nuovoId } from '@/lib/calendario-portale';
import { ChipsPortieri } from './Portieri';
import { ElencoMesi, Legenda, RigaPartita } from './Righe';
import { ModificaPartita } from './Modifiche';
import { Messaggio, useSalva } from './salvataggio';

type Id = Partita & { id: string };
import type { Portieri } from '@/lib/portale-dati';

export function CalendarioSquadra({ squadra, nomeSquadra, ufficiali: uff0, amichevoli: am0, giochiDi, eventi, oggi, puoAmichevoli, puoUfficiali, preparatore }: {
  squadra: SquadraCal; nomeSquadra: string; ufficiali: Id[]; amichevoli: Id[]; giochiDi: Record<string, string[]>; eventi: Evento[];
  oggi: string; puoAmichevoli: boolean; puoUfficiali: boolean;
  preparatore?: { partite: Impegno[]; portieri: Portieri; eta: number[] | null };
}) {
  const [ufficiali, setUfficiali] = useState(uff0);
  const [amichevoli, setAmichevoli] = useState(am0);
  const [aperta, setAperta] = useState<string | null>(null);
  const [portiere, setPortiere] = useState('');
  const { salva, messaggio } = useSalva();
  const pathCal = 'calendar/' + squadra.id, pathReg = 'registro/' + squadra.id;

  /* ---------- modifiche ---------- */
  function cambia(tipo: 'uff' | 'am', id: string, campi: Partial<Partita>) {
    const [elenco, set, path, lista] = tipo === 'uff' ? [ufficiali, setUfficiali, pathCal, 'matches'] as const : [amichevoli, setAmichevoli, pathReg, 'friendlies'] as const;
    const nuova = { ...elenco.find((x) => x.id === id)!, ...campi };
    set(elenco.map((x) => (x.id === id ? nuova : x)));
    salva(path, [{ lista, id, voce: nuova }]);
    setAperta(id);
  }
  function elimina(tipo: 'uff' | 'am', m: Id) {
    if (tipo === 'am') {
      const giochi = giochiDi[m.id] ?? [];
      if (!confirm(`Eliminare l'amichevole${m.opponent ? ' con ' + m.opponent : ''}?${giochi.length ? ' Si cancellano anche minuti e gol segnati.' : ''}`)) return;
      setAmichevoli((l) => l.filter((x) => x.id !== m.id));
      salva(pathReg, [{ lista: 'friendlies', id: m.id, voce: null }, ...giochi.map((g) => ({ lista: 'games', id: g, voce: null }))], 0);
    } else {
      if (!confirm(`Eliminare la partita${m.opponent ? ' con ' + m.opponent : ''}?`)) return;
      setUfficiali((l) => l.filter((x) => x.id !== m.id));
      salva(pathCal, [{ lista: 'matches', id: m.id, voce: null }], 0);
    }
  }
  function aggiungi(tipo: 'uff' | 'am') {
    if (tipo === 'am') {
      const f = { id: nuovoId('am'), date: oggi, time: '', opponent: '', venue: '', home: true };
      setAmichevoli((l) => [...l, f]); salva(pathReg, [{ lista: 'friendlies', id: f.id, voce: f }], 0); setAperta(f.id);
    } else {
      const m = { id: nuovoId('m'), date: '', time: '', opponent: '', venue: '', home: false };
      setUfficiali((l) => [...l, m]); salva(pathCal, [{ lista: 'matches', id: m.id, voce: m }], 0); setAperta(m.id);
    }
  }

  /* ---------- preparatori ---------- */
  if (preparatore) {
    const tuttiGk = Object.entries(preparatore.portieri).flatMap(([teamId, d]) => d.gk.map((p) => ({ ...p, teamId, sigla: siglaSquadra(d.team) })));
    const squadraGk = tuttiGk.find((p) => p.id === portiere)?.teamId;
    const prossime = inOrdine(preparatore.partite.filter((m) => daGiocare(m, oggi)).filter((m) => !squadraGk || m.team?.id === squadraGk));
    const chips = (m: Impegno) => <ChipsPortieri m={m} portieri={preparatore.portieri} solo={portiere} />;
    return (
      <div className="space-y-3">
        <Legenda />
        <p className="max-w-prose text-grigio">Le partite da giocare delle categorie dei tuoi portieri (le assegna la società). Tutta la società è in “Tutte le squadre”.</p>
        {tuttiGk.length > 0 && (
          <label className="flex items-center gap-2 text-sm text-grigio">Portiere
            <select className="campo w-auto" value={portiere} onChange={(e) => setPortiere(e.target.value)}>
              <option value="">Tutti i miei portieri</option>
              {tuttiGk.map((p) => <option key={p.teamId + p.id} value={p.id}>{p.name} · {p.sigla}</option>)}
            </select>
          </label>
        )}
        {prossime.length ? <ElencoMesi ms={prossime} riga={(m) => <RigaPartita m={m} tutte conData squadre={[]}>{chips(m)}</RigaPartita>} />
          : <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita da giocare.</p>}
      </div>
    );
  }

  /* ---------- una squadra ---------- */
  const tutte: Impegno[] = [
    ...ufficiali.map((m) => ({ ...m, team: squadra })),
    ...amichevoli.map((m) => ({ ...m, friendly: true, daRegistro: true, team: squadra })),
  ];
  const prossime = inOrdine([...tutte, ...eventi.map(eventoCome)].filter((m) => daGiocare(m, oggi)));
  const giocate = inOrdine(tutte.filter((m) => !daGiocare(m, oggi))).reverse();
  const modifica = (m: Impegno) => {
    if (m.daRegistro && puoAmichevoli) return <ModificaPartita m={m} titolo="Modifica amichevole" aperta={aperta === m.id}
      cambia={(c) => cambia('am', m.id!, c)} elimina={() => elimina('am', m as Id)} eliminaTesto="Elimina amichevole" />;
    if (!m.daRegistro && !m.evento && puoUfficiali) return <ModificaPartita m={m} titolo="Modifica" aperta={aperta === m.id}
      cambia={(c) => cambia('uff', m.id!, c)} elimina={() => elimina('uff', m as Id)} eliminaTesto="Elimina partita" />;
    return null;
  };
  const riga = (m: Impegno) => <RigaPartita m={m} tutte={false} conData nomeSquadra={nomeSquadra} squadre={[squadra]}>{modifica(m)}</RigaPartita>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {puoAmichevoli && <button className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu" onClick={() => aggiungi('am')}>+ Aggiungi amichevole</button>}
        {puoUfficiali && <button className="rounded-lg px-3 py-1.5 text-sm font-semibold text-blu hover:bg-blu/5" onClick={() => aggiungi('uff')}>+ Partita ufficiale</button>}
      </div>
      <p className="max-w-prose text-sm text-grigio">
        Le partite da giocare fino a fine stagione{puoUfficiali ? '; “Modifica” per cambiarne una' : puoAmichevoli ? '; le tue amichevoli si cambiano da “Modifica amichevole”' : ''}. Quelle giocate sono nello storico, in fondo.
      </p>
      <Legenda />
      {prossime.length ? <ElencoMesi ms={prossime} riga={riga} />
        : <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita da giocare.</p>}
      {giocate.length > 0 && (
        <details className="border-t border-linea pt-3">
          <summary className="cursor-pointer font-display text-lg font-semibold">Storico · {giocate.length} {giocate.length === 1 ? 'partita giocata' : 'partite giocate'}</summary>
          <div className="mt-2"><ElencoMesi ms={giocate} riga={riga} /></div>
        </details>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
