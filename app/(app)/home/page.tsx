import Link from 'next/link';
import { getProfilo } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ETICHETTA_RUOLO, nomeCompleto, puoSegnalare, vedeTutto } from '@/lib/ruoli';
import { STATI, type StatoGiocatore } from '@/lib/tipi';
import { dataBreve, dataOraBreve, istanteTraOre } from '@/lib/utili';

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

export default async function Home() {
  const profilo = (await getProfilo())!;
  const tutto = vedeTutto(profilo.ruolo);
  const supabase = await createClient();

  const [ultime, mieGare, conteggi] = await Promise.all([
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

  return (
    <div className="space-y-10">
      <section>
        <p className="text-grigio">{ETICHETTA_RUOLO[profilo.ruolo]}</p>
        <h1 className="font-display text-4xl font-bold">Ciao {profilo.nome ?? nomeCompleto(profilo)}</h1>
      </section>

      {puoSegnalare(profilo.ruolo) && (
        <Link
          href="/segnala"
          className="flex items-center justify-between gap-6 rounded-2xl bg-blu px-6 py-7 text-white hover:bg-blu-scuro"
        >
          <span>
            <span className="block font-display text-3xl font-bold leading-tight">Segnala un giocatore</span>
            <span className="mt-1 block text-white/80">Annata, ruolo, società e cosa hai visto. Il nome può aspettare.</span>
          </span>
          <span
            aria-hidden
            className="grid size-16 shrink-0 place-items-center rounded-full border-4 border-oro font-display text-4xl font-bold"
          >
            +
          </span>
        </Link>
      )}

      {tutto && perStato.size > 0 && (
        <section>
          <h2 className="font-display text-2xl font-bold">Archivio</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(STATI) as StatoGiocatore[]).filter((s) => perStato.get(s)).map((s) => (
              <Link
                key={s}
                href={`/giocatori?stato=${s}`}
                className="rounded-lg border border-linea bg-white px-4 py-2 hover:border-blu"
              >
                <span className="font-display text-2xl font-bold">{perStato.get(s)}</span>{' '}
                <span className="text-sm text-grigio">{STATI[s].toLowerCase()}</span>
              </Link>
            ))}
          </div>
        </section>
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
                <li key={g.id} className="px-4 py-3">
                  <p className="text-sm text-grigio">{dataOraBreve(g.data_ora)} – {g.categoria}</p>
                  <p className="font-semibold">{g.casa_nome} – {g.trasferta_nome}</p>
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
