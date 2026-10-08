import Link from 'next/link';
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ETICHETTA_RUOLO, nomeCompleto, puoSegnalare, vedeTutto } from '@/lib/ruoli';
import { STATI, type StatoGiocatore } from '@/lib/tipi';
import { dataBreve, dataOraBreve, istanteTraOre } from '@/lib/utili';
import { elencoSocieta } from '@/lib/societa';
import { staffScouting } from '@/lib/staff';
import { Avviso } from '@/components/Avviso';
import { Incarichi, SELECT_INCARICO, type Incarico } from '@/components/Incarichi';
import { Colonne, Fascia, NumeroFascia, Riquadro } from '@/components/dashboard/Pezzi';

type UltimaSegnalazione = {
  id: string;
  data: string;
  testo: string;
  autore: { nome: string | null; cognome: string | null; email: string } | null;
  squadra: string | null; // segnalazione di un mister dal Portale squadre
  giocatore: { id: string; cognome: string | null; nome: string | null; descrizione: string | null; annata: number } | null;
};

type MiaGara = {
  gara: { id: string; data_ora: string; categoria: string; casa_nome: string; trasferta_nome: string } | null;
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; errore?: string }>;
}) {
  const { ok, errore } = await searchParams;
  const profilo = (await getProfilo())!;
  const tutto = vedeTutto(profilo.ruolo);
  const supabase = await createClient();

  const [ultime, mieGare, conteggi, aperti, fatti, societa, staff, mieSegn, mieVal] = await Promise.all([
    supabase
      .from('segnalazioni')
      .select('*, autore:profiles(nome, cognome, email), giocatore:giocatori(id, cognome, nome, descrizione, annata)')
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('gare_osservatori')
      .select('gara:gare!inner(id, data_ora, categoria, casa_nome, trasferta_nome)')
      .eq('profilo_id', profilo.id)
      .gte('gara.data_ora', istanteTraOre(-3)),
    tutto ? supabase.from('giocatori').select('stato').eq('osservato', true) : Promise.resolve({ data: null }),
    // Incarichi: aperti (prima quelli con la data più vicina) e gli ultimi fatti
    supabase.from('incarichi').select(SELECT_INCARICO).eq('fatto', false)
      .order('quando', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false }),
    supabase.from('incarichi').select(SELECT_INCARICO).eq('fatto', true).order('fatto_il', { ascending: false }).limit(10),
    tutto ? elencoSocieta(supabase) : Promise.resolve([]),
    tutto ? staffScouting(supabase) : Promise.resolve([]),
    supabase.from('segnalazioni').select('created_at').eq('autore_id', profilo.id).gte('created_at', istanteTraOre(-24 * 7 * 8)),
    supabase.from('valutazioni').select('id', { count: 'exact', head: true }).eq('autore_id', profilo.id).gte('created_at', istanteTraOre(-24 * 30)),
  ]);

  const segnalazioni = (ultime.data as unknown as UltimaSegnalazione[]) ?? [];
  const gare = ((mieGare.data as unknown as MiaGara[]) ?? [])
    .map((r) => r.gara)
    .filter((g): g is NonNullable<MiaGara['gara']> => g !== null)
    .sort((a, b) => a.data_ora.localeCompare(b.data_ora));
  const perStato = new Map<StatoGiocatore, number>();
  for (const r of (conteggi.data as { stato: StatoGiocatore }[] | null) ?? []) {
    perStato.set(r.stato, (perStato.get(r.stato) ?? 0) + 1);
  }

  /* le mie segnalazioni settimana per settimana (8 settimane fino a oggi) */
  const adesso = Date.parse(istanteTraOre(0));
  const settimane = Array.from({ length: 8 }, () => 0);
  for (const x of (mieSegn.data as { created_at: string }[] | null) ?? []) {
    const i = 7 - Math.floor((adesso - Date.parse(x.created_at)) / (7 * 864e5)); if (i >= 0 && i < 8) settimane[i]++;
  }
  const incarichiAperti = ((aperti.data as unknown as Incarico[]) ?? []).length;
  const statiGrafico: StatoGiocatore[] = ['in_lista', 'in_osservazione', 'da_rivedere', 'inserito', 'da_non_inserire'];
  const maxStato = Math.max(1, ...statiGrafico.map((s) => perStato.get(s) ?? 0));

  return (
    <div className="space-y-8">
      <Fascia titolo={`Ciao ${profilo.nome ?? nomeCompleto(profilo)}`} sottotitolo={`${ETICHETTA_RUOLO[profilo.ruolo]} · Scouting`}>
        <NumeroFascia titolo="Mie segnalazioni" valore={settimane.reduce((a, x) => a + x, 0)} sotto="Nelle ultime 8 settimane, settimana per settimana.">
          <Colonne valori={settimane} />
        </NumeroFascia>
        <NumeroFascia titolo="Mie valutazioni" valore={mieVal.count ?? 0} sotto="Negli ultimi 30 giorni." />
        <NumeroFascia titolo="Mie gare" valore={gare.length} sotto={gare[0] ? `Prossima: ${dataOraBreve(gare[0].data_ora)}` : 'Nessuna gara: sceglila in Gare.'} />
        <NumeroFascia titolo="Incarichi" valore={incarichiAperti} sotto="Aperti, da prendere o da chiudere." />
      </Fascia>

      <Avviso ok={ok} errore={errore} />

      {puoSegnalare(profilo.ruolo) && (
        <Link
          href="/segnala"
          className="flex items-center justify-between gap-6 rounded-2xl border-2 border-blu bg-white px-6 py-6 text-blu hover:bg-blu/5"
        >
          <span>
            <span className="block font-display text-3xl font-bold leading-tight">Segnala un giocatore</span>
            <span className="mt-1 block text-grigio">Annata, ruolo, società e cosa hai visto. Il nome può aspettare.</span>
          </span>
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-oro font-display text-4xl font-bold"
          >
            +
          </span>
        </Link>
      )}

      <Incarichi
        aperti={(aperti.data as unknown as Incarico[]) ?? []}
        fatti={(fatti.data as unknown as Incarico[]) ?? []}
        mioId={profilo.id}
        gestore={tutto}
        societa={societa.map((s) => s.nome)}
        staff={staff}
      />

      {tutto && perStato.size > 0 && (
        <Riquadro titolo="Archivio per stato" spiegazione="Giocatori osservati: da chi è in lista fino a chi è stato inserito. Tocca uno stato per l’elenco." href="/giocatori/stati">
          <ul className="space-y-2">
            {statiGrafico.map((s, i) => (
              <li key={s}>
                <Link href={`/giocatori?stato=${s}`} className="grid grid-cols-[8rem_1fr] items-center gap-2 text-sm hover:opacity-80">
                  <span className="font-semibold">{STATI[s]}</span>
                  <span className="flex items-center gap-2">
                    <i className="block h-5 rounded-md" style={{ width: `${Math.max(2, ((perStato.get(s) ?? 0) / maxStato) * 100)}%`, background: s === 'da_non_inserire' ? 'var(--color-linea)' : `color-mix(in srgb, var(--color-blu) ${100 - i * 18}%, white)` }} />
                    <b className="font-display text-base tabular-nums">{perStato.get(s) ?? 0}</b>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Riquadro>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Le mie gare</h2>
            <Link href="/gare" className="text-sm font-medium text-blu">Tutte le gare</Link>
          </div>
          {gare.length === 0 ? (
            <p className="mt-3 text-grigio">Non sei segnato su nessuna gara. Sceglila dalla pagina Gare.</p>
          ) : (
            <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white">
              {gare.map((g) => (
                <li key={g.id}>
                  <Link href={`/gare/${g.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-carta">
                    <span>
                      <span className="block text-sm text-grigio">{dataOraBreve(g.data_ora)} – {g.categoria}</span>
                      <span className="block font-semibold">{g.casa_nome} – {g.trasferta_nome}</span>
                    </span>
                    <span aria-hidden className="text-grigio">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-bold">Ultime segnalazioni</h2>
            <Link href="/giocatori" className="text-sm font-medium text-blu">Archivio</Link>
          </div>
          {segnalazioni.length === 0 ? (
            <p className="mt-3 text-grigio">Ancora nessuna segnalazione.</p>
          ) : (
            <ul className="mt-3 divide-y divide-linea rounded-xl border border-linea bg-white">
              {segnalazioni.map((s) => (
                <li key={s.id}>
                  <Link href={`/giocatori/${s.giocatore?.id}`} className="block px-4 py-3 hover:bg-carta">
                    <p className="font-semibold">
                      {[s.giocatore?.cognome, s.giocatore?.nome].filter(Boolean).join(' ') || s.giocatore?.descrizione}{' '}
                      <span className="font-normal text-grigio">({s.giocatore?.annata})</span>
                    </p>
                    <p className="line-clamp-2 text-sm">{s.testo}</p>
                    <p className="mt-1 text-xs text-grigio">
                      {s.autore ? nomeCompleto(s.autore) : s.squadra ? `Mister ${s.squadra}` : 'Autore non disponibile'} – {dataBreve(s.data)}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

    </div>
  );
}
