// Necessità dello scouting (0036): che giocatori cerca la società. Le scrivono admin e direttori, le leggono anche
// gli scout. Sotto ogni richiesta, i giocatori già in archivio (osservati, non dell'Academy, né inseriti né scartati)
// che rientrano nei parametri: annate, ruolo, piede. Chi ha ruolo o piede non indicato sta a parte, "da verificare".
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import { annateDisponibili, GIUDIZI, PIEDI, RUOLI_CAMPO, type Giudizio, type Piede, type RuoloCampo, type StatoGiocatore } from '@/lib/tipi';
import { categoriaDaAnnata } from '@/lib/categorie';
import { elencoSocieta, idNostraSocieta } from '@/lib/societa';
import { dataBreve } from '@/lib/utili';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { StatoBadge } from '@/components/StatoBadge';
import { ContattoFlag } from '@/components/ContattoFlag';
import { conContatto } from '@/lib/contatti';
import { SlotValutazioni, valutatori } from '@/components/Autore';
import { Annata } from '@/components/Annata';
import { conVoti, mediaVoti } from '@/lib/valutazioni';
import { apriChiudiNecessita, eliminaNecessita, salvaNecessita } from './actions';

type Necessita = {
  id: string; titolo: string | null; annata_da: number; annata_a: number; ruolo: RuoloCampo | null; piede: Piede | null;
  priorita: 'alta' | 'media' | 'bassa'; note: string | null; aperta: boolean; created_at: string;
};
type Giocatore = {
  id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number;
  ruolo: RuoloCampo | null; piede: Piede | null; stato: StatoGiocatore; societa_id: string | null; societa: { nome: string } | null;
  valutazioni: {
    tecnica: number | null; motoria: number | null; tattica: number | null; mentale: number | null; giudizio: Giudizio; data: string;
    autore_id: string | null; autore_squadra: string | null; autore: { nome: string | null; cognome: string | null; email: string } | null;
  }[];
  segnalazioni: { data: string; tecnica: number | null; motoria: number | null; tattica: number | null; mentale: number | null }[];
};

const PRIORITA = { alta: 'Priorità alta', media: 'Priorità media', bassa: 'Priorità bassa' } as const;
const COLORE_PRIORITA = { alta: 'bg-rosso text-white', media: 'bg-oro text-inchiostro', bassa: 'bg-carta text-grigio border border-linea' } as const;
const COLORE_GIUDIZIO: Record<Giudizio, string> = {
  da_prendere: 'bg-blu text-white', da_rivedere: 'bg-oro/30 text-inchiostro', non_a_livello: 'bg-rosso/15 text-rosso',
};
const PESO_GIUDIZIO: Record<string, number> = { da_prendere: 0, da_rivedere: 1, nessuno: 2, non_a_livello: 3 };

const ultima = (g: Giocatore) => [...g.valutazioni].sort((a, b) => b.data.localeCompare(a.data))[0];
/* media dei voti per area dell'ultima segnalazione o valutazione che ne ha (0043) */
const mediaG = (g: Giocatore) => { const r = conVoti([...g.segnalazioni, ...g.valutazioni])[0]; return r ? mediaVoti(r) : null; };
const annate = (n: Pick<Necessita, 'annata_da' | 'annata_a'>) =>
  n.annata_da === n.annata_a ? `${n.annata_da} (${categoriaDaAnnata(n.annata_da).split(' - ')[0]})` : `${n.annata_da}–${n.annata_a}`;

/** Giocatori che rientrano: sicuri (ruolo e piede giusti) e da verificare (ruolo o piede non indicato) */
function candidati(n: Necessita, tutti: Giocatore[]) {
  const sicuri: Giocatore[] = [], daVerificare: Giocatore[] = [];
  for (const g of tutti) {
    if (g.annata < n.annata_da || g.annata > n.annata_a) continue;
    if (n.ruolo && g.ruolo && g.ruolo !== n.ruolo) continue;
    if (n.piede && g.piede && g.piede !== n.piede && g.piede !== 'ambidestro') continue;
    ((n.ruolo && !g.ruolo) || (n.piede && !g.piede) ? daVerificare : sicuri).push(g);
  }
  const ordina = (l: Giocatore[]) => l.sort((a, b) => {
    const va = ultima(a), vb = ultima(b);
    return PESO_GIUDIZIO[va?.giudizio ?? 'nessuno'] - PESO_GIUDIZIO[vb?.giudizio ?? 'nessuno'] || (mediaG(b) ?? 0) - (mediaG(a) ?? 0);
  });
  return { sicuri: ordina(sicuri), daVerificare: ordina(daVerificare) };
}

function RigaGiocatore({ g, contatto }: { g: Giocatore; contatto: boolean }) {
  const v = ultima(g), m = mediaG(g);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
      <Link href={`/giocatori/${g.id}`} className="min-w-40 flex-1 font-semibold text-blu hover:underline">
        {[g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione || 'Senza nome'}
        <span className="block text-xs font-normal text-grigio">
          <Annata annata={g.annata} /> {[g.ruolo ? RUOLI_CAMPO[g.ruolo] : 'ruolo ?', g.piede ? `piede ${PIEDI[g.piede].toLowerCase()}` : 'piede ?', g.societa?.nome]
            .filter(Boolean).join(' · ')}
        </span>
      </Link>
      <SlotValutazioni firme={valutatori(g.valutazioni)} piccolo />
      <ContattoFlag presente={contatto} breve />
      <StatoBadge stato={g.stato} />
      <span className="w-12 text-center font-display text-lg font-bold" title="Media dei voti per area dell'ultima segnalazione o valutazione">{m ? m.toFixed(1) : '–'}</span>
      {v
        ? <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORE_GIUDIZIO[v.giudizio]}`}>{GIUDIZI[v.giudizio]}</span>
        : <span className="rounded-full border border-linea px-2.5 py-0.5 text-xs font-semibold text-grigio">Da valutare</span>}
    </li>
  );
}

function ModuloNecessita({ n }: { n?: Necessita }) {
  const anni = annateDisponibili();
  return (
    <form action={salvaNecessita} className="mt-3 space-y-3">
      {n && <input type="hidden" name="id" value={n.id} />}
      <Etichetta testo="Cosa cerchiamo">
        <input name="titolo" defaultValue={n?.titolo ?? ''} placeholder="Es. Terzino sinistro veloce" className="campo" />
      </Etichetta>
      <div className="grid grid-cols-2 gap-3">
        <Etichetta testo="Annata *">
          <select name="annata_da" required defaultValue={n?.annata_da ?? ''} className="campo">
            <option value="" disabled>Scegli</option>
            {anni.map((a) => <option key={a} value={a}>{a} · {categoriaDaAnnata(a).split(' - ')[0]}</option>)}
          </select>
        </Etichetta>
        <Etichetta testo="Fino all'annata" aiuto="Solo se va bene più di un'annata">
          <select name="annata_a" defaultValue={n && n.annata_a !== n.annata_da ? n.annata_a : ''} className="campo">
            <option value="">Solo quella</option>
            {anni.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Etichetta>
        <Etichetta testo="Ruolo">
          <select name="ruolo" defaultValue={n?.ruolo ?? ''} className="campo">
            <option value="">Qualsiasi</option>
            {Object.entries(RUOLI_CAMPO).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Etichetta>
        <Etichetta testo="Piede">
          <select name="piede" defaultValue={n?.piede ?? ''} className="campo">
            <option value="">Qualsiasi</option>
            {Object.entries(PIEDI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </Etichetta>
      </div>
      <Etichetta testo="Priorità">
        <select name="priorita" defaultValue={n?.priorita ?? 'media'} className="campo">
          {Object.entries(PRIORITA).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </Etichetta>
      <textarea name="note" rows={2} defaultValue={n?.note ?? ''} placeholder="Caratteristiche (es. veloce, bravo nell'uno contro uno)" className="campo" />
      <button className="bottone w-full">{n ? 'Salva modifiche' : 'Aggiungi necessità'}</button>
    </form>
  );
}

export default async function PaginaNecessita({ searchParams }: { searchParams: Promise<{ ok?: string; errore?: string; chiuse?: string }> }) {
  const profilo = (await getProfilo())!;
  if (!puoSegnalare(profilo.ruolo)) redirect('/home');
  const { ok, errore, chiuse } = await searchParams;
  const direttore = gestisce(profilo.ruolo);
  const supabase = await createClient();

  const { data: nd, error } = await supabase.from('necessita').select('*').order('created_at', { ascending: false });
  const tutte = (nd as Necessita[] | null) ?? [];
  const PESO = { alta: 0, media: 1, bassa: 2 };
  const aperte = tutte.filter((n) => n.aperta).sort((a, b) => PESO[a.priorita] - PESO[b.priorita]);
  const chiuseL = tutte.filter((n) => !n.aperta);
  const mostra = chiuse ? chiuseL : aperte;

  // Un'unica lettura dei giocatori per tutte le annate richieste
  let giocatori: Giocatore[] = [];
  if (mostra.length) {
    const min = Math.min(...mostra.map((n) => n.annata_da)), max = Math.max(...mostra.map((n) => n.annata_a));
    const academy = idNostraSocieta(await elencoSocieta(supabase));
    const { data } = await supabase.from('giocatori')
      .select('id, cognome, nome, descrizione, annata, ruolo, piede, stato, societa_id, societa(nome), segnalazioni(data, tecnica, motoria, tattica, mentale), valutazioni(tecnica, motoria, tattica, mentale, giudizio, data, autore_id, autore_squadra, autore:profiles(nome, cognome, email))')
      .eq('osservato', true).gte('annata', min).lte('annata', max)
      .not('stato', 'in', '(inserito,da_non_inserire)');
    giocatori = ((data as unknown as Giocatore[]) ?? []).filter((g) => !academy || g.societa_id !== academy);
  }
  const contatto = await conContatto(supabase, giocatori.map((g) => g.id));   // 0037: solo sì/no

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Necessità</h1>
          <p className="mt-1 text-grigio">Che giocatori cerca la società. Sotto ogni richiesta, quelli già in archivio che rientrano.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/necessita" className={`rounded-full px-3 py-1.5 font-semibold ${!chiuse ? 'bg-blu text-white' : 'border border-linea'}`}>Aperte ({aperte.length})</Link>
          <Link href="/necessita?chiuse=1" className={`rounded-full px-3 py-1.5 font-semibold ${chiuse ? 'bg-blu text-white' : 'border border-linea'}`}>Chiuse ({chiuseL.length})</Link>
        </div>
      </section>

      <Avviso ok={ok} errore={errore ?? (error ? 'Pagina non ancora attiva: serve la migrazione 0036.' : undefined)} />

      {direttore && !chiuse && (
        <details className="rounded-xl border border-linea bg-white p-4" open={!aperte.length}>
          <summary className="cursor-pointer font-display text-xl font-bold">+ Nuova necessità</summary>
          <ModuloNecessita />
        </details>
      )}

      {!mostra.length && <p className="text-grigio">{chiuse ? 'Nessuna necessità chiusa.' : 'Nessuna necessità aperta.'}</p>}

      {mostra.map((n) => {
        const { sicuri, daVerificare } = candidati(n, giocatori);
        return (
          <section key={n.id} className="rounded-xl border border-linea bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="font-display text-2xl font-bold">
                  {n.titolo || [n.ruolo ? RUOLI_CAMPO[n.ruolo] : 'Giocatore', n.piede ? `piede ${PIEDI[n.piede].toLowerCase()}` : null].filter(Boolean).join(' ')}
                </h2>
                <p className="text-sm text-grigio">
                  {[`Annata ${annate(n)}`, n.ruolo ? RUOLI_CAMPO[n.ruolo] : 'qualsiasi ruolo', n.piede ? `piede ${PIEDI[n.piede].toLowerCase()}` : null,
                    `dal ${dataBreve(n.created_at)}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${COLORE_PRIORITA[n.priorita]}`}>{PRIORITA[n.priorita]}</span>
            </div>
            {n.note && <p className="mt-2 whitespace-pre-line">{n.note}</p>}

            <h3 className="mt-4 font-display text-lg font-bold">
              Già in archivio: {sicuri.length} {sicuri.length === 1 ? 'giocatore' : 'giocatori'}
            </h3>
            {sicuri.length
              ? <ul className="divide-y divide-linea">{sicuri.map((g) => <RigaGiocatore key={g.id} g={g} contatto={contatto.has(g.id)} />)}</ul>
              : <p className="text-sm text-grigio">Ancora nessuno: da cercare sui campi.</p>}
            {daVerificare.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm font-semibold text-blu">
                  Da verificare: {daVerificare.length} con {n.ruolo && n.piede ? 'ruolo o piede' : n.ruolo ? 'ruolo' : 'piede'} non indicato
                </summary>
                <ul className="divide-y divide-linea">{daVerificare.map((g) => <RigaGiocatore key={g.id} g={g} contatto={contatto.has(g.id)} />)}</ul>
              </details>
            )}

            {direttore && (
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-linea pt-3">
                <details className="flex-1">
                  <summary className="cursor-pointer text-sm font-semibold text-blu">Modifica</summary>
                  <ModuloNecessita n={n} />
                </details>
                <form action={apriChiudiNecessita}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="aperta" value={n.aperta ? '0' : '1'} />
                  <button className="rounded-lg border border-linea px-3 py-2 text-sm font-semibold">{n.aperta ? 'Chiudi (trovato)' : 'Riapri'}</button>
                </form>
                <form action={eliminaNecessita}>
                  <input type="hidden" name="id" value={n.id} />
                  <button className="text-sm text-grigio hover:text-rosso">Elimina</button>
                </form>
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
