// Società → Archivio documenti (0039; nell'app dalla tappa 3): i PDF scaricati dal Portale, con chi e quando.
// Li vedono e scaricano admin e direttori, li elimina l'admin. L'elenco non porta con sé i file: si scaricano uno alla volta.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { vedeTutto } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { Avviso } from '@/components/Avviso';
import { Conferma } from '@/components/Conferma';
import { eliminaDocumento } from '../actions';

type Documento = { id: string; nome: string; tipo: string; squadra: string | null; autore: string | null; dimensione: number; created_at: string };
const PER_PAGINA = 50;
const kb = (n: number) => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('it-IT', { timeZone: 'Europe/Rome', ...o }).format(new Date(d));

export default async function Archivio({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profilo = await getProfilo();
  if (!profilo) redirect('/inizio');   // mister con la tessera: qui non entra
  if (!vedeTutto(profilo.ruolo)) redirect(profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  const { tipo = '', squadra = '', q = '', ok, errore, mostra } = await searchParams;
  const supabase = await createClient();
  const { data, error } = await supabase.from('archivio_documenti')
    .select('id, nome, tipo, squadra, autore, dimensione, created_at').order('created_at', { ascending: false }).limit(2000);
  const tutti = (data as Documento[] | null) ?? [];
  const cerca = q.trim().toLowerCase();
  const lista = tutti.filter((d) => (!tipo || d.tipo === tipo) && (!squadra || d.squadra === squadra)
    && (!cerca || [d.nome, d.autore, d.squadra, d.tipo].join(' ').toLowerCase().includes(cerca)));
  const quanti = Math.max(PER_PAGINA, Number(mostra) || PER_PAGINA);
  const tipi = [...new Set(tutti.map((d) => d.tipo))].sort(), squadre = [...new Set(tutti.map((d) => d.squadra).filter(Boolean))].sort() as string[];
  const admin = profilo.ruolo === 'admin';
  /* righe mostrate, ognuna col suo mese: il titolo del mese compare quando cambia */
  const righe = lista.slice(0, quanti).map((d, i, arr) => {
    const m = fmt(d.created_at, { month: 'long', year: 'numeric' });
    return { d, m, nuovoMese: i === 0 || fmt(arr[i - 1].created_at, { month: 'long', year: 'numeric' }) !== m };
  });

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Archivio documenti</h1>
        <p className="mt-1 max-w-prose text-grigio">
          Ogni PDF scaricato dall’app (convocazioni, fogli gara, report, distinte, programmi, comunicazioni) ne lascia qui una copia,
          con chi l’ha scaricato e quando. I fogli con i PIN delle famiglie non si archiviano.
        </p>
      </div>
      <Avviso ok={ok} errore={errore} />
      {error && <p className="text-rosso">Archivio non disponibile: {error.message}</p>}

      <form method="GET" className="grid grid-cols-1 gap-3 rounded-xl border border-linea bg-white p-4 sm:grid-cols-4">
        <select name="tipo" defaultValue={tipo} className="campo" aria-label="Tipo di documento">
          <option value="">Tutti i documenti</option>
          {tipi.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select name="squadra" defaultValue={squadra} className="campo" aria-label="Squadra">
          <option value="">Tutte le squadre</option>
          {squadre.map((s) => <option key={s}>{s}</option>)}
        </select>
        <input type="search" name="q" defaultValue={q} placeholder="Cerca per nome, squadra o chi" className="campo" aria-label="Cerca nell’archivio" />
        <button className="bottone">Filtra</button>
      </form>

      <p className="text-sm text-grigio">{lista.length} {lista.length === 1 ? 'documento' : 'documenti'}</p>
      {lista.length === 0 ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessun documento.</p>
      ) : (
        <ul className="divide-y divide-linea rounded-xl border border-linea bg-white">
          {righe.map(({ d, m, nuovoMese }) => {
            return (
              <li key={d.id}>
                {nuovoMese && <p className="bg-carta px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-grigio">{m}</p>}
                <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blu/10 px-2 py-0.5 text-xs font-semibold text-blu">{d.tipo}</span>
                      <b className="break-all">{d.nome}</b>
                    </p>
                    <p className="text-sm text-grigio">
                      {[fmt(d.created_at, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }), d.squadra, d.autore, kb(d.dimensione)].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`/societa/archivio/${d.id}`} className="rounded-lg border border-blu px-3 py-1.5 text-sm font-semibold text-blu hover:bg-blu/5">Scarica</a>
                    {admin && (
                      <form action={eliminaDocumento}>
                        <input type="hidden" name="id" value={d.id} />
                        <Conferma domanda={`Eliminare "${d.nome}" dall’archivio?`} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-grigio hover:text-rosso">Elimina</Conferma>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {lista.length > quanti && (
        <a href={`?${new URLSearchParams({ tipo, squadra, q, mostra: String(quanti + PER_PAGINA) })}`} className="inline-block rounded-lg border border-linea px-4 py-2 text-sm font-medium hover:border-blu">
          Mostra altri
        </a>
      )}
    </div>
  );
}
