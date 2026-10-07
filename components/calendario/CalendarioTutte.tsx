'use client';
// Calendario → Tutte le squadre: le partite da giocare di tutte le squadre ed eventi della società, vista Giorno (come Google
// Calendar) o Elenco, filtro per categoria. Admin, direttori e organizzativo cambiano amichevoli e tornei di ogni squadra
// (calendar/<squadra>) e gli eventi (shared/eventi), aggiungono amichevoli ed eventi, importano da file (ImportaFile) e aggiornano da Google. Il campionato
// no: vale sempre il calendario ufficiale (salvo comunicati).
import { useEffect, useRef, useState } from 'react';
import { eventoCome, type Evento, type Impegno, type Partita, type SquadraCal } from '@/lib/programma';
import { daGiocare, inOrdine, nuovoId } from '@/lib/calendario-portale';
import { ElencoMesi, Legenda, RigaPartita } from './Righe';
import { VistaGiorno } from './VistaGiorno';
import { ModificaEvento, ModificaPartita } from './Modifiche';
import { Messaggio, useSalva } from './salvataggio';
import { useGoogle } from './google';
import { ImportaFile } from './ImportaFile';

export function CalendarioTutte({ squadre: iniziali, eventi: eventiIniziali, mia, oggi, puoOrganizzare, google }: {
  squadre: SquadraCal[]; eventi: Evento[]; mia: string | null; oggi: string; puoOrganizzare: boolean; google: boolean;
}) {
  const [squadre, setSquadre] = useState(iniziali);
  const [eventi, setEventi] = useState(eventiIniziali);
  const [categoria, setCategoria] = useState('');
  const [vista, setVista] = useState<'giorno' | 'elenco'>('giorno');
  const [aperta, setAperta] = useState<string | null>(null);
  const [nuovaPer, setNuovaPer] = useState('');
  const [googleEsito, setGoogleEsito] = useState('');
  const [googleInCorso, setGoogleInCorso] = useState(false);
  const { salva, messaggio, setMessaggio } = useSalva();
  const g = useGoogle(google, setMessaggio);
  /* stato più recente, per le risposte di Google che arrivano qualche secondo dopo la modifica */
  const ultimo = useRef({ squadre, eventi });
  useEffect(() => { ultimo.current = { squadre, eventi }; }, [squadre, eventi]);
  /* all'apertura: se sono passati 30 minuti si rilegge Google; se è cambiato qualcosa si ricarica la pagina */
  useEffect(() => {
    if (!google) return;
    g.auto().then((j) => {
      const cambi = (j.squadre ?? []).reduce((s, x) => s + x.aggiunte + x.aggiornate + x.tolte, 0);
      if (cambi) { setGoogleEsito(`Da Google: ${cambi} impegni aggiornati. Ricarico…`); window.location.reload(); }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [google]);

  const filtrabili = squadre.filter((t) => !t.organizza && (t.id === mia || t.matches.length));
  const perAmichevoli = squadre.filter((t) => !t.organizza && !t.vedeTutte);
  const tutte: Impegno[] = [...squadre.flatMap((t) => t.matches.map((m) => ({ ...m, team: t }))), ...eventi.map(eventoCome)];
  const ms = inOrdine(tutte.filter((m) => daGiocare(m, oggi)).filter((m) => !categoria || m.team?.id === categoria
    || (m.evento && (!(m.evento.squadre ?? []).length || m.evento.squadre!.includes(categoria)))));

  /* ---------- modifiche ---------- */
  function cambiaPartita(teamId: string, id: string, campi: Partial<Partita>, attesa?: number) {
    const t = ultimo.current.squadre.find((x) => x.id === teamId), vecchia = t?.matches.find((x) => x.id === id);
    if (!t || !vecchia) return;
    const nuova = { ...vecchia, ...campi };
    ultimo.current = { ...ultimo.current, squadre: ultimo.current.squadre.map((x) => (x.id === teamId ? { ...x, matches: x.matches.map((m) => (m.id === id ? nuova : m)) } : x)) };
    setSquadre((l) => l.map((x) => (x.id === teamId ? { ...x, matches: x.matches.map((m) => (m.id === id ? nuova : m)) } : x)));
    salva('calendar/' + teamId, [{ lista: 'matches', id, voce: nuova as Partita & { id: string } }], attesa);
    setAperta(`${teamId}|${id}`);
    if (!('gcal' in campi)) g.partita(teamId, nuova, (x) => cambiaPartita(teamId, id, x, 0));
  }
  function eliminaPartita(teamId: string, m: Partita) {
    if (!confirm(`Eliminare la partita con ${m.opponent || 'avversario'}?`)) return;
    setSquadre((l) => l.map((x) => (x.id === teamId ? { ...x, matches: x.matches.filter((y) => y.id !== m.id) } : x)));
    salva('calendar/' + teamId, [{ lista: 'matches', id: m.id!, voce: null }], 0);
    g.cancella(m);
  }
  function aggiungiAmichevole() {
    const teamId = nuovaPer || perAmichevoli[0]?.id; if (!teamId) return;
    const m = { id: nuovoId('m'), date: oggi, time: '', opponent: '', home: true, venue: '', friendly: true, tipo: 'Partita', note: '' };
    setSquadre((l) => l.map((x) => (x.id === teamId ? { ...x, matches: [...x.matches, m] } : x)));
    salva('calendar/' + teamId, [{ lista: 'matches', id: m.id, voce: m }], 0);
    setCategoria(teamId); setVista('elenco'); setAperta(`${teamId}|${m.id}`);
  }
  function cambiaEvento(id: string, campi: Partial<Evento>, attesa?: number) {
    const vecchio = ultimo.current.eventi.find((x) => x.id === id); if (!vecchio) return;
    const nuovo = { ...vecchio, ...campi };
    ultimo.current = { ...ultimo.current, eventi: ultimo.current.eventi.map((x) => (x.id === id ? nuovo : x)) };
    setEventi((l) => l.map((x) => (x.id === id ? nuovo : x)));
    salva('shared/eventi', [{ lista: 'items', id, voce: nuovo }], attesa);
    setAperta(`ev|ev_${id}`);
    if (!('gcal' in campi)) g.evento(nuovo, (x) => cambiaEvento(id, x, 0));
  }
  function eliminaEvento(ev: Evento) {
    if (!confirm(`Eliminare l'evento "${ev.titolo || 'senza titolo'}"?`)) return;
    setEventi((l) => l.filter((x) => x.id !== ev.id));
    salva('shared/eventi', [{ lista: 'items', id: ev.id, voce: null }], 0);
    g.cancella(ev);
  }
  function nuovoEvento() {
    const ev: Evento = { id: nuovoId('ev'), titolo: '', tipo: 'Torneo organizzato', data: oggi, inizio: '', fine: '', luogo: 'merate', indirizzo: '', squadre: [], note: '' };
    setEventi((l) => [...l, ev]);
    salva('shared/eventi', [{ lista: 'items', id: ev.id, voce: ev }], 0);
    setCategoria(''); setVista('elenco'); setAperta(`ev|ev_${ev.id}`);
  }
  async function importaGoogle() {
    setGoogleInCorso(true); setGoogleEsito('');
    try {
      const j = await g.importa();
      const n = (k: 'aggiunte' | 'aggiornate' | 'tolte') => j.squadre.reduce((s, x) => s + x[k], 0);
      setGoogleEsito(`Letti ${j.partite} impegni: ${n('aggiunte')} nuovi, ${n('aggiornate')} cambiati, ${n('tolte')} tolti. Ricarico…`);
      window.location.reload();
    } catch (e) {
      setGoogleEsito('Non riuscito: ' + (e as Error).message);
    }
    setGoogleInCorso(false);
  }

  /* sotto la riga: modifica dell'evento o di amichevoli e tornei (non del campionato, non delle amichevoli del registro) */
  const modifica = (m: Impegno) => {
    if (!puoOrganizzare) return null;
    if (m.evento) return <ModificaEvento e={m.evento} squadre={perAmichevoli} aperta={aperta === `ev|${m.id}`}
      cambia={(c) => cambiaEvento(m.evento!.id, c)} elimina={() => eliminaEvento(m.evento!)} />;
    if (!m.team || m.garaId || !m.friendly || m.daRegistro) return null;
    const teamId = m.team.id;
    return <ModificaPartita m={m} titolo="Modifica" aperta={aperta === `${teamId}|${m.id}`}
      cambia={(c) => cambiaPartita(teamId, m.id!, c)} elimina={() => eliminaPartita(teamId, m)} eliminaTesto="Elimina partita" />;
  };
  const riga = (m: Impegno) => (
    <RigaPartita m={m} tutte conData mia={!!mia && m.team?.id === mia} squadre={squadre}>{modifica(m)}</RigaPartita>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Legenda />
        <div className="inline-flex overflow-hidden rounded-lg border border-linea" role="group" aria-label="Vista">
          {(['giorno', 'elenco'] as const).map((v) => (
            <button key={v} aria-pressed={vista === v} onClick={() => setVista(v)}
              className={`px-4 py-1.5 text-sm font-semibold ${vista === v ? 'bg-blu text-white' : 'bg-white'}`}>{v === 'giorno' ? 'Giorno' : 'Elenco'}</button>
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-sm text-grigio">Categoria
        <select className="campo w-auto" value={categoria} onChange={(e) => { setCategoria(e.target.value); setAperta(null); }}>
          <option value="">Tutte le categorie</option>
          {filtrabili.map((t) => <option key={t.id} value={t.id}>{t.category || t.name}</option>)}
        </select>
      </label>

      {!ms.length ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna partita in programma.</p>
        : vista === 'giorno' ? <VistaGiorno key={categoria} ms={ms} mia={mia} dettaglio={riga} />
          : <ElencoMesi ms={ms} riga={riga} />}

      {puoOrganizzare && (
        <div className="space-y-2 pt-2">
          <div className="flex flex-wrap items-center gap-2">
            <label className="text-sm text-grigio" htmlFor="nuova_per">Nuova partita per</label>
            <select id="nuova_per" className="campo w-auto" value={nuovaPer || perAmichevoli[0]?.id || ''} onChange={(e) => setNuovaPer(e.target.value)}>
              {perAmichevoli.map((t) => <option key={t.id} value={t.id}>{t.category || t.name}</option>)}
            </select>
            <button className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu" onClick={aggiungiAmichevole}>+ Aggiungi amichevole</button>
            <button className="rounded-lg border border-blu bg-blu px-3 py-1.5 text-sm font-semibold text-white" onClick={nuovoEvento}>+ Nuovo evento</button>
            <ImportaFile squadre={squadre} eventi={eventi} oggi={oggi} />
          </div>
          {google ? (
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-lg border border-linea bg-white px-3 py-1.5 text-sm font-semibold hover:border-blu disabled:opacity-60" disabled={googleInCorso} onClick={importaGoogle}>
                {googleInCorso ? 'Leggo Google…' : '↻ Aggiorna da Google'}
              </button>
              <span className="text-sm text-grigio">{googleEsito || 'Partite, tornei ed eventi creati qui vanno anche su Google.'}</span>
            </div>
          ) : <p className="text-sm text-grigio">Collegamento con Google Calendar non ancora attivo.</p>}
        </div>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}

