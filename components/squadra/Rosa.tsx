'use client';
// Squadra → Rosa: per il mister numero della partita, nome e ruolo (lo sceglie lui); per l'admin anche nome modificabile,
// aggiunta (uno a uno o incollando un elenco) ed eliminazione. Da Under 13 in su ruoli completi, sotto portiere o movimento.
import { useState } from 'react';
import { eliminaGiocatore, impostaRuolo } from '@/app/(aree)/docs-actions';
import { nuovoId } from '@/lib/calendario-portale';
import { Messaggio, useSalva } from '@/components/calendario/salvataggio';

/* dati = il giocatore com'è nella rosa (con eventuali altri campi, che si conservano) */
type Giocatore = { id: string; name: string; numero: string; ruolo: string; dati: Record<string, unknown> };
const RUOLI_PIENI = [['portiere', 'Portiere'], ['difensore', 'Difensore'], ['centrocampista', 'Centrocampista'], ['attaccante', 'Attaccante']];
const RUOLI_BASE = [['portiere', 'Portiere'], ['movimento', 'Giocatore di movimento']];

export function Rosa({ squadraId, giocatori: iniziali, ruoliBase, admin, soloLettura }: {
  squadraId: string; giocatori: Giocatore[]; ruoliBase: boolean; admin: boolean; soloLettura: boolean;
}) {
  const [giocatori, setGiocatori] = useState(iniziali);
  const [elenco, setElenco] = useState('');
  const { salva, messaggio, setMessaggio } = useSalva();
  const ruoli = ruoliBase ? RUOLI_BASE : RUOLI_PIENI;
  const path = 'roster/' + squadraId;
  const voce = (g: Giocatore) => ({ ...g.dati, id: g.id, name: g.name });

  async function cambiaRuolo(g: Giocatore, ruolo: string) {
    setGiocatori((l) => l.map((x) => (x.id === g.id ? { ...x, ruolo } : x)));
    setMessaggio('Salvataggio…');
    const r = await impostaRuolo(squadraId, g.id, ruolo).catch(() => ({ ok: false, errore: 'rete assente' }));
    setMessaggio(r.ok ? 'Salvato' : `Non salvato: ${r.errore ?? 'riprova'}`);
  }
  function rinomina(g: Giocatore, name: string) {
    const nuovo = { ...g, name };
    setGiocatori((l) => l.map((x) => (x.id === g.id ? nuovo : x)));
    salva(path, [{ lista: 'players', id: g.id, voce: voce(nuovo) }]);
  }
  function aggiungi(nomi: string[]) {
    const nuovi = nomi.map((name) => ({ id: nuovoId('p'), name, numero: '', ruolo: '', dati: {} }));
    setGiocatori((l) => [...l, ...nuovi]);
    salva(path, nuovi.map((g) => ({ lista: 'players', id: g.id, voce: voce(g) })), 0);
  }
  async function elimina(g: Giocatore) {
    if (!confirm(`Eliminare ${g.name || 'questo giocatore'} dalla rosa?`)) return;
    setGiocatori((l) => l.filter((x) => x.id !== g.id));
    setMessaggio('Salvataggio…');
    const r = await eliminaGiocatore(squadraId, g.id).catch(() => ({ ok: false, errore: 'rete assente' }));
    setMessaggio(r.ok ? 'Giocatore eliminato' : `Non eliminato: ${r.errore ?? 'riprova'}`);
  }
  /* un nome per riga; un numero davanti ("7. Rossi", "7 - Rossi") si ignora */
  const dallElenco = () => elenco.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => (l.match(/^\d{1,3}\s*[-.)]?\s*(.+)$/)?.[1] ?? l).trim());

  const selettore = (g: Giocatore) => (
    <select className="w-36 shrink-0 rounded-lg border border-linea bg-white px-2 py-2 text-sm disabled:opacity-70 sm:w-44" aria-label={`Ruolo di ${g.name}`} value={g.ruolo} disabled={soloLettura} onChange={(e) => cambiaRuolo(g, e.target.value)}>
      <option value="">Ruolo</option>
      {ruoli.map(([v, e]) => <option key={v} value={v}>{e}</option>)}
    </select>
  );
  const numero = (g: Giocatore) => (
    <span className={`inline-flex size-8 shrink-0 items-center justify-center rounded-full font-display text-lg font-bold ${g.numero ? 'bg-blu text-white' : 'bg-carta text-grigio'}`}>{g.numero || '–'}</span>
  );

  return (
    <div className="space-y-4">
      <p className="max-w-prose text-grigio">
        {admin ? 'Nome e ruolo: il numero di maglia lo assegni in Formazione, cambia partita per partita (titolari 1-11, panchina 12+). Il ruolo lo può scegliere anche il mister'
          : 'Il numero è quello di questa partita (titolari 1-11, panchina 12+): lo decidi tu in Formazione. Scegli il ruolo di ogni giocatore: per i portieri potrai inserire i gol subiti nelle partite'}
        {ruoliBase ? ' (in questa categoria: portiere o giocatore di movimento).' : '.'}
      </p>
      {!admin && <p className="rounded-md bg-carta px-4 py-3 text-sm text-grigio">🔒 La rosa la inserisce la società. Per aggiungere o togliere un giocatore, scrivi all’amministratore.</p>}

      {giocatori.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">
          {admin ? 'Nessun giocatore. Aggiungili uno a uno o incolla un elenco.' : 'La rosa non è ancora stata caricata.'}
        </p>
      ) : (
        <ul className={`grid grid-cols-1 gap-x-4 rounded-xl border border-linea bg-white px-3 ${admin ? '' : 'sm:grid-cols-2'}`}>
          {giocatori.map((g) => (
            <li key={g.id} className="flex items-center gap-2 border-b border-linea py-2 last:border-b-0">
              {numero(g)}
              {admin
                ? <input className="campo min-w-0 flex-1 py-2" aria-label="Nome" placeholder="Cognome" value={g.name} onChange={(e) => rinomina(g, e.target.value)} />
                : <span className="line-clamp-2 min-w-0 flex-1 break-words font-semibold leading-tight">{g.name}</span>}
              {selettore(g)}
              {admin && <button aria-label={`Elimina ${g.name}`} className="rounded-md px-2 py-1 text-xl leading-none text-grigio hover:text-rosso" onClick={() => elimina(g)}>×</button>}
            </li>
          ))}
        </ul>
      )}

      {admin && (
        <>
          <button className="rounded-lg border border-linea bg-white px-4 py-2 font-semibold hover:border-blu" onClick={() => aggiungi([''])}>Aggiungi giocatore</button>
          <details open={!giocatori.length} className="rounded-xl border border-linea bg-white p-3">
            <summary className="cursor-pointer font-semibold">Incolla un elenco</summary>
            <p className="mt-2 text-sm text-grigio">Un nome per riga, per esempio <b>Brancaccio</b>. Se incolli righe con un numero davanti va bene lo stesso, lo ignoriamo.</p>
            <textarea className="campo mt-2" rows={5} placeholder={'Alonge\nVascaneau\nBrancaccio'} value={elenco} onChange={(e) => setElenco(e.target.value)} />
            <button className="bottone mt-2" disabled={!elenco.trim()} onClick={() => { aggiungi(dallElenco()); setElenco(''); }}>Aggiungi all’elenco</button>
          </details>
        </>
      )}
      <Messaggio testo={messaggio} />
    </div>
  );
}
