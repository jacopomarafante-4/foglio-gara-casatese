import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { gestisce, nomeCompleto, puoSegnalare, vedeTutto } from '@/lib/ruoli';
import { arricchisci, CENTRO_DISTANZE, SELECT_GARA, squadreSeguite, type Gara } from '@/lib/gare';
import { elencoSocieta } from '@/lib/societa';
import { staffScouting } from '@/lib/staff';
import { dataBreve } from '@/lib/utili';
import { GaraCard } from '@/components/GaraCard';
import { Avviso } from '@/components/Avviso';
import { Etichetta } from '@/components/Etichetta';
import { CaricaDistinte } from '@/components/CaricaDistinte';
import { eliminaDistinta, eliminaPartita, modificaGara } from './actions';

type Segnalazione = {
  id: string; data: string; testo: string; voto: number | null; contesto: string | null;
  autore: { nome: string | null; cognome: string | null; email: string } | null;
  giocatore: { id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number } | null;
};

/** Data e ora italiane di un istante, per i campi del modulo */
function partiItaliane(iso: string) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return { data: `${p.year}-${p.month}-${p.day}`, ora: `${p.hour}:${p.minute}` };
}

/** Una partita: dati, chi ci va, giocatori segnalati lì, distinte; modifica per chi l'ha inserita e per i direttori */
export default async function PaginaGara({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; errore?: string }>;
}) {
  const { id } = await params;
  const { ok, errore } = await searchParams;
  const profilo = (await getProfilo())!;
  const supabase = await createClient();

  const [{ data }, { data: extra }, seguite, segn, { data: al }] = await Promise.all([
    supabase.from('gare').select(SELECT_GARA).eq('id', id).maybeSingle(),
    supabase.from('gare').select('chiave, inserita_da').eq('id', id).maybeSingle(),
    squadreSeguite(supabase),
    supabase.from('segnalazioni')
      .select('id, data, testo, voto, contesto, autore:profiles(nome, cognome, email), giocatore:giocatori(id, cognome, nome, descrizione, annata)')
      .eq('gara_id', id).order('created_at'),
    supabase.from('gare_allegati').select('id, percorso, nome_file, caricato_da').eq('gara_id', id).order('created_at'),
  ]);
  if (!data) notFound();
  const gara = arricchisci(data as unknown as Gara, CENTRO_DISTANZE, seguite);
  const aMano = !extra?.chiave;
  const puoModificare = vedeTutto(profilo.ruolo) || (aMano && extra?.inserita_da === profilo.id && puoSegnalare(profilo.ruolo));

  const firmati = al?.length ? (await supabase.storage.from('distinte').createSignedUrls(al.map((a) => a.percorso), 3600)).data : [];
  const distinte = (al ?? []).map((a, i) => ({ ...a, url: firmati?.[i]?.signedUrl ?? null }));
  const staff = gestisce(profilo.ruolo) ? await staffScouting(supabase) : undefined;
  const societa = puoModificare ? await elencoSocieta(supabase) : [];
  const segnalazioni = (segn.data as unknown as Segnalazione[]) ?? [];
  const { data: giorno, ora } = partiItaliane(gara.data_ora);

  return (
    <div className="space-y-6">
      <Link href="/gare" className="text-sm text-grigio hover:text-blu">‹ Gare da vedere</Link>
      <Avviso ok={ok} errore={errore} />

      <GaraCard gara={gara} mioId={profilo.id} puoPrenotarsi={puoSegnalare(profilo.ruolo)} staff={staff}
        allegati={distinte.filter((d) => d.url).map((d) => ({ nome: d.nome_file ?? 'Distinta', url: d.url! }))} />

      {/* Giocatori segnalati durante questa partita */}
      <section className="space-y-3">
        <h2 className="font-display text-2xl font-bold">Giocatori visti in questa partita</h2>
        {segnalazioni.length === 0 ? (
          <p className="text-grigio">Nessuna segnalazione legata a questa partita.</p>
        ) : (
          <ul className="divide-y divide-linea rounded-xl border border-linea bg-white">
            {segnalazioni.map((s) => (
              <li key={s.id}>
                <Link href={`/giocatori/${s.giocatore?.id}`} className="block px-4 py-3 hover:bg-carta">
                  <p className="font-semibold">
                    {[s.giocatore?.cognome, s.giocatore?.nome].filter(Boolean).join(' ') || s.giocatore?.descrizione}{' '}
                    <span className="font-normal text-grigio">({s.giocatore?.annata})</span>
                    {s.voto && <span className="ml-2 text-blu">{s.voto}/5</span>}
                  </p>
                  <p className="line-clamp-2 text-sm">{s.testo}</p>
                  <p className="mt-1 text-xs text-grigio">{s.autore ? nomeCompleto(s.autore) : ''} – {dataBreve(s.data)}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {puoSegnalare(profilo.ruolo) && (
          <Link href="/segnala" className="inline-block rounded-lg border border-blu px-4 py-2.5 font-semibold text-blu hover:bg-blu/5">
            + Segnala un giocatore
          </Link>
        )}
      </section>

      {/* Modifica: chi l'ha inserita, admin e direttori */}
      {puoModificare && (
        <>
          <section className="space-y-3 rounded-xl border border-linea bg-white p-4">
            <h2 className="font-display text-2xl font-bold">Distinte</h2>
            {distinte.length > 0 && (
              <ul className="space-y-1 text-sm">
                {distinte.map((d, i) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    {d.url ? <a href={d.url} target="_blank" rel="noreferrer" className="hover:text-blu">📎 Distinta {i + 1} · {d.nome_file}</a> : <span>📎 {d.nome_file}</span>}
                    <form action={eliminaDistinta}>
                      <input type="hidden" name="id" value={d.id} />
                      <input type="hidden" name="gara_id" value={id} />
                      <button className="text-grigio hover:text-rosso">Elimina</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <CaricaDistinte garaId={id} />
          </section>

          <details className="rounded-xl border border-linea bg-white p-4" open={!!errore}>
            <summary className="cursor-pointer font-display text-2xl font-bold">Modifica partita</summary>
            {!aMano && (
              <p className="mt-2 text-sm text-grigio">
                È una gara dei calendari ufficiali: se la modifichi diventa “Variata · Modificata a mano” e la prossima importazione non la sovrascrive.
              </p>
            )}
            <datalist id="gara-societa">{societa.map((s) => <option key={s.id} value={s.nome} />)}</datalist>
            <form action={modificaGara} className="mt-3 grid gap-3 sm:grid-cols-3">
              <input type="hidden" name="id" value={id} />
              <Etichetta testo="Data *"><input type="date" name="data" required defaultValue={giorno} className="campo" /></Etichetta>
              <Etichetta testo="Ora"><input type="time" name="ora" defaultValue={gara.ora_da_definire ? '' : ora} className="campo" /></Etichetta>
              <Etichetta testo="Categoria *"><input name="categoria" required defaultValue={gara.categoria} className="campo" /></Etichetta>
              <Etichetta testo="Squadra di casa *"><input name="casa" list="gara-societa" required defaultValue={gara.casa_nome} className="campo" autoComplete="off" /></Etichetta>
              <Etichetta testo="Squadra ospite *"><input name="trasferta" list="gara-societa" required defaultValue={gara.trasferta_nome} className="campo" autoComplete="off" /></Etichetta>
              <Etichetta testo="Campo"><input name="campo" defaultValue={gara.campo ?? ''} className="campo" /></Etichetta>
              <div className="sm:col-span-3">
                <Etichetta testo="Indirizzo del campo"><input name="indirizzo" defaultValue={gara.indirizzo ?? ''} className="campo" /></Etichetta>
              </div>
              <div className="sm:col-span-3"><button className="bottone">Salva modifiche</button></div>
            </form>
            {aMano && (
              <form action={eliminaPartita} className="mt-4 border-t border-linea pt-4">
                <input type="hidden" name="id" value={id} />
                <button className="text-sm font-semibold text-rosso hover:underline">Elimina partita</button>
                <span className="ml-2 text-sm text-grigio">Le segnalazioni restano sulle schede dei giocatori.</span>
              </form>
            )}
          </details>
        </>
      )}
    </div>
  );
}
