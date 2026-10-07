import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { etaDaCategoria, fineStagione } from '@/lib/categorie';
import { gestisce, puoSegnalare } from '@/lib/ruoli';
import { arricchisci, CENTRO_DISTANZE, giocatoriDellaGara, SELECT_GARA, squadreSeguite, type Gara, type GiocatoreInGara } from '@/lib/gare';
import { GaraCard } from '@/components/GaraCard';
import { StaffGare } from '@/components/AffidaGara';
import { Avviso } from '@/components/Avviso';
import { CalendarioSquadre } from '@/components/scouting/CalendarioSquadre';
import { staffScouting } from '@/lib/staff';
import { istanteTraOre } from '@/lib/utili';

const ANNATA_MIN = 2008, ANNATA_MAX = 2021;
const LIMITE = 5000;
const MOSTRA = 40;
/** Tolleranza sul limite di km (le distanze sono in linea d'aria) */
const TOLLERANZA = 1.1;
const chipVista = (attiva: boolean) => `rounded-full px-3 py-1.5 text-sm font-semibold ${attiva ? 'bg-blu text-white' : 'border border-linea bg-white'}`;

export default async function Gare({
  searchParams,
}: {
  searchParams: Promise<{ vista?: string; squadra?: string; km?: string; periodo?: string; adb?: string; ago?: string; annata?: string; tutte?: string; ok?: string; errore?: string }>;
}) {
  const filtri = await searchParams;
  const profilo = (await getProfilo())!;
  // Gare e Calendario in un unico pannello: due schede interne, "Calendario" solo per chi vedeva già /calendario
  const vista = filtri.vista === 'calendario' && puoSegnalare(profilo.ruolo) ? 'calendario' : 'gare';
  const schede = puoSegnalare(profilo.ruolo) && (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Vista">
      <Link href="/gare" className={chipVista(vista === 'gare')}>Gare da vedere</Link>
      <Link href={`/gare?vista=calendario`} className={chipVista(vista === 'calendario')}>Calendario squadre</Link>
    </div>
  );
  if (vista === 'calendario') {
    return (
      <div className="space-y-5">
        <h1 className="font-display text-4xl font-bold">Gare</h1>
        {schede}
        <CalendarioSquadre squadra={filtri.squadra} periodo={filtri.periodo} />
      </div>
    );
  }
  const supabase = await createClient();

  const km = Math.max(1, Number(filtri.km) || 25);
  const giorni = filtri.periodo === 'tutte' ? null : 7;
  // nessuna spunta = tutte e due
  const conAdb = filtri.adb === '1' || filtri.ago !== '1';
  const conAgonistica = filtri.ago === '1' || filtri.adb !== '1';
  const annataNum = Number((filtri.annata ?? '').trim());
  const annata = Number.isInteger(annataNum) && annataNum >= ANNATA_MIN && annataNum <= ANNATA_MAX ? annataNum : null;
  const annataErrata = !!(filtri.annata ?? '').trim() && !annata;

  // Squadre seguite e giocatori segnalati ancora aperti: servono per evidenziarli nelle gare
  const [seguite, { data: giocatoriData }] = await Promise.all([
    squadreSeguite(supabase),
    supabase
      .from('giocatori')
      // solo i campi che servono per dire chi gioca in quale gara (GiocatoreInGara)
      .select('id, cognome, nome, descrizione, annata, categoria, societa_id, stato')
      .not('societa_id', 'is', null)
      .eq('osservato', true)
      .not('stato', 'in', '(inserito,da_non_inserire)'),
  ]);
  const giocatori = (giocatoriData as GiocatoreInGara[] | null) ?? [];

  // Da 3 ore fa (gare appena iniziate) ai prossimi N giorni
  // il database restituisce al massimo 1000 righe per volta: a blocchi, fino a LIMITE
  const gareData: unknown[] = [];
  let error: { message: string } | null = null;
  for (let da = 0; da < LIMITE; da += 1000) {
    let q = supabase.from('gare').select(SELECT_GARA).gte('data_ora', istanteTraOre(-3)).order('data_ora').order('id').range(da, da + 999);
    if (giorni) q = q.lte('data_ora', istanteTraOre(giorni * 24));
    const r = await q;
    if (r.error) { error = r.error; break; }
    gareData.push(...(r.data ?? []));
    if ((r.data ?? []).length < 1000) break;
  }

  const sede = CENTRO_DISTANZE;
  const staff = gestisce(profilo.ruolo) ? await staffScouting(supabase) : undefined;
  const tutteLeGare = (gareData as unknown as Gara[]) ?? [];
  const fine = fineStagione();

  /** Età della categoria della gara: AdB fino a 13 anni (Esordienti), agonistica da 14; categoria non chiara = si tiene */
  const gare = tutteLeGare
    .filter((g) => {
      const eta = etaDaCategoria(g.categoria, fine);
      if (!eta) return true;
      if (eta.max <= 13 ? !conAdb : !conAgonistica) return false;
      return !annata || (fine - annata >= eta.min && fine - annata <= eta.max);
    })
    .map((g) => ({ ...arricchisci(g, sede, seguite), giocatori: giocatoriDellaGara(g, giocatori) }))
    .filter((g) => g.distanza === null || g.distanza <= km * TOLLERANZA);
  /* Al massimo MOSTRA gare (con AdB sono migliaia): prima quelle con giocatori segnalati o squadre seguite, poi le più vicine
     nel tempo; "Mostra tutte" toglie il limite */
  const interessa = (g: (typeof gare)[number]) => g.seguite.length > 0 || g.giocatori.length > 0;
  const mostrate = filtri.tutte === '1' ? gare
    : [...gare.filter(interessa), ...gare.filter((g) => !interessa(g))].slice(0, MOSTRA).sort((x, y) => x.data_ora.localeCompare(y.data_ora));
  const nascoste = gare.length - mostrate.length;
  const conTutte = () => { const u = new URLSearchParams(Object.entries(filtri).filter(([k, v]) => v && k !== 'ok' && k !== 'errore') as [string, string][]); u.set('tutte', '1'); return `/gare?${u}`; };

  // Distinte caricate (foto/PDF): link temporanei, solo per chi può vederle (RLS)
  const allegati = new Map<string, { nome: string; url: string }[]>();
  if (gare.length) {
    const { data: al } = await supabase.from('gare_allegati').select('gara_id, percorso, nome_file').in('gara_id', mostrate.map((g) => g.id).slice(0, 300));
    if (al?.length) {
      const { data: firmati } = await supabase.storage.from('distinte').createSignedUrls(al.map((a) => a.percorso), 3600);
      al.forEach((a, i) => {
        const url = firmati?.[i]?.signedUrl;
        if (url) allegati.set(a.gara_id, [...(allegati.get(a.gara_id) ?? []), { nome: a.nome_file ?? 'Distinta', url }]);
      });
    }
  }

  // Raggruppate per giorno
  const perGiorno = new Map<string, typeof gare>();
  for (const g of mostrate) {
    const giorno = new Date(g.data_ora).toLocaleDateString('it-IT', {
      timeZone: 'Europe/Rome', weekday: 'long', day: 'numeric', month: 'long',
    });
    perGiorno.set(giorno, [...(perGiorno.get(giorno) ?? []), g]);
  }
  const scoperte = gare.filter((g) => (g.seguite.length > 0 || g.giocatori.length > 0) && g.osservatori.length === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-bold">Gare da vedere</h1>
          <p className="text-grigio">
            {gare.length} gare{nascoste > 0 && ` (qui le prime ${mostrate.length})`}
            {tutteLeGare.length === LIMITE && ' (le prime 5000: restringi i filtri)'}
            {scoperte > 0 && <> – <strong className="text-inchiostro">{scoperte} senza osservatore</strong></>}
          </p>
        </div>
        {puoSegnalare(profilo.ruolo) && (
          <Link href="/gare/nuova" className="bottone">Aggiungi partita</Link>
        )}
      </div>
      {schede}

      <Avviso ok={filtri.ok} errore={filtri.errore} />

      {/* Filtri: tutti alti uguali (h-12), testi corti per non essere tagliati */}
      <form method="GET" className="grid grid-cols-2 items-end gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_auto]">
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Entro km</span>
          <input type="number" name="km" min={1} max={200} defaultValue={km} className="campo h-12 py-0" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-grigio">Periodo</span>
          <select name="periodo" defaultValue={giorni ? '' : 'tutte'} className="campo h-12 py-0">
            <option value="">7 giorni</option>
            <option value="tutte">Tutte</option>
          </select>
        </label>
        <fieldset className="col-span-2 block sm:col-span-1">
          <legend className="mb-1 block text-xs text-grigio">Attività</legend>
          <div className="flex h-12 items-center gap-4">
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" name="adb" value="1" defaultChecked={conAdb} className="size-5" />AdB
            </label>
            <label className="flex items-center gap-2 font-semibold">
              <input type="checkbox" name="ago" value="1" defaultChecked={conAgonistica} className="size-5" />Agonistica
            </label>
          </div>
        </fieldset>
        <label className="col-span-2 block sm:col-span-1">
          <span className="mb-1 block text-xs text-grigio">Anno di nascita</span>
          <input type="text" name="annata" inputMode="numeric" pattern="20(0[89]|1\d|2[01])" maxLength={4}
            placeholder={`${ANNATA_MIN}–${ANNATA_MAX}`} defaultValue={annata ?? filtri.annata ?? ''}
            title={`Un anno dal ${ANNATA_MIN} al ${ANNATA_MAX}`} className="campo h-12 py-0" />
        </label>
        <button className="bottone col-span-2 h-12 px-6 sm:col-span-4 lg:col-span-1">Aggiorna</button>
      </form>
      {annataErrata && <p className="-mt-3 text-sm text-rosso">Anno di nascita dal {ANNATA_MIN} al {ANNATA_MAX}: filtro non applicato.</p>}

      {error && <p className="text-rosso">Errore nel caricamento: {error.message}</p>}

      {gare.length === 0 ? (
        <div className="rounded-xl border border-dashed border-linea p-10 text-center text-grigio">
          Nessuna gara con questi filtri.
          {puoSegnalare(profilo.ruolo) && (
            <>
              {' '}
              <Link href="/gare/nuova" className="font-medium text-blu underline">Aggiungi una partita</Link>.
            </>
          )}
        </div>
      ) : (
        <>
          {gare.length > 0 && (
            <StaffGare staff={staff ?? []}>{[...perGiorno].map(([giorno, lista]) => (
              <section key={giorno}>
                <h2 className="mb-3 font-display text-2xl font-bold first-letter:uppercase">{giorno}</h2>
                <div className="space-y-3">
                  {lista.map((g) => (
                    <GaraCard key={g.id} gara={g} mioId={profilo.id} puoPrenotarsi={puoSegnalare(profilo.ruolo)} allegati={allegati.get(g.id)} staff={staff ? 'pagina' : undefined} />
                  ))}
                </div>
              </section>
            ))}</StaffGare>
          )}
          {nascoste > 0 && (
            <p className="rounded-xl border border-dashed border-linea p-4 text-center text-grigio">
              Altre {nascoste} gare non mostrate: riduci i km o scrivi l’anno di nascita.{' '}
              <Link href={conTutte()} className="font-semibold text-blu underline">Mostra tutte</Link>
            </p>
          )}
        </>
      )}

      {gestisce(profilo.ruolo) && (
        <p className="text-sm">
          <Link href="/gare/gestione" className="text-grigio underline hover:text-blu">Squadre seguite e campi delle società</Link>
        </p>
      )}
      <p className="text-xs text-grigio">
        Distanze in linea d’aria da metà strada tra Merate e Cernusco Lombardone, con il 10% di tolleranza sul limite.
        Le gare senza coordinate del campo sono sempre mostrate con “km ?”.
      </p>
    </div>
  );
}
