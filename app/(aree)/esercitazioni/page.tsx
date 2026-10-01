// Esercitazioni (0052): l'eserciziario della società. Per ora SOLO l'admin (lavori in corso, non pubblicato ai mister).
// Elenco con filtri (testo, tipo, fase, categoria, giorno del morfociclo) e anteprima della lavagna.
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import { CATEGORIE, FASI, MORFOCICLO, TIPI, areaPerGiocatore, durataTotale, etichetta, filtra, type Esercizio } from '@/lib/esercizi';
import { Lavagna } from '@/components/esercizi/Lavagna';
import { Avviso } from '@/components/Avviso';
import { creaEsercizio } from './actions';

type Filtri = { q?: string; tipo?: string; fase?: string; categoria?: string; md?: string; ok?: string; errore?: string };

export default async function Esercitazioni({ searchParams }: { searchParams: Promise<Filtri> }) {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') redirect('/inizio');
  const f = await searchParams;
  const { data, error } = await (await createClient()).from('esercizi').select('*').order('updated_at', { ascending: false });
  const tutti = (data ?? []) as Esercizio[], lista = filtra(tutti, f);
  const scelta = (nome: keyof Filtri, voci: readonly { k: string; l: string }[] | string[], vuoto: string) => (
    <select name={nome} defaultValue={f[nome] ?? ''} className="campo">
      <option value="">{vuoto}</option>
      {voci.map((v) => typeof v === 'string' ? <option key={v} value={v}>{v}</option> : <option key={v.k} value={v.k}>{v.l}</option>)}
    </select>
  );
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Esercitazioni</h1>
          <p className="text-grigio">L&apos;eserciziario della società. <b>Lavori in corso: lo vede solo l&apos;admin.</b></p>
        </div>
        <form action={creaEsercizio}><button className="bottone">+ Nuovo esercizio</button></form>
      </div>
      <Avviso ok={f.ok} errore={f.errore ?? (error ? 'Esercitazioni non ancora attive: serve la migrazione 0052.' : undefined)} />
      <form method="GET" className="grid gap-2 rounded-xl border border-linea bg-white p-3 sm:grid-cols-3 lg:grid-cols-6">
        <input name="q" defaultValue={f.q ?? ''} placeholder="Cerca…" className="campo sm:col-span-3 lg:col-span-2" aria-label="Cerca" />
        {scelta('tipo', TIPI, 'Tutti i tipi')}
        {scelta('fase', FASI, 'Tutte le fasi')}
        {scelta('categoria', CATEGORIE, 'Tutte le categorie')}
        {scelta('md', MORFOCICLO, 'Tutti i giorni')}
        <button className="bottone sm:col-span-3 lg:col-span-6">Filtra</button>
      </form>
      <p className="text-sm text-grigio">{lista.length} {lista.length === 1 ? 'esercizio' : 'esercizi'}{lista.length !== tutti.length ? ` su ${tutti.length}` : ''}</p>
      {!lista.length ? <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">
        {tutti.length ? 'Nessun esercizio con questi filtri.' : 'Ancora nessun esercizio: crea il primo con "+ Nuovo esercizio".'}</p> : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((e) => {
            const app = areaPerGiocatore(e), durata = durataTotale(e);
            return (
              <li key={e.id}>
                <Link href={`/esercitazioni/${e.id}`} className="block h-full rounded-xl border border-linea bg-white p-3 hover:border-blu">
                  <Lavagna dati={e.lavagna ?? {}} lunghezza={Number(e.lunghezza) || 30} larghezza={Number(e.larghezza) || 20} soloVista />
                  <b className="mt-2 block font-display text-xl leading-tight">{e.titolo}</b>
                  <span className="block text-sm text-grigio">{[etichetta(TIPI, e.tipo), etichetta(FASI, e.fase), e.principio].filter(Boolean).join(' · ')}</span>
                  <span className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold">
                    {e.formato && <span className="rounded-full bg-carta px-2 py-0.5">{e.formato}</span>}
                    {app && <span className="rounded-full bg-carta px-2 py-0.5">{app} m²/gioc.</span>}
                    {durata && <span className="rounded-full bg-carta px-2 py-0.5">{durata}′</span>}
                    {e.morfociclo && <span className="rounded-full bg-blu/10 px-2 py-0.5 text-blu">{e.morfociclo}</span>}
                    {e.categorie.map((c) => <span key={c} className="rounded-full border border-linea px-2 py-0.5">{c.replace('Under ', 'U')}</span>)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
