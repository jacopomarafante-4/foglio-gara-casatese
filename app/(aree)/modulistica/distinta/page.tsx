// Modulistica → Distinta (nell'app dalla tappa 3): per tornei e amichevoli omologate, dal foglio della squadra
// (sheet/<squadra>.distinta) e dalla rosa. Mister (tessera del PIN): la sua squadra, con coach_leggi/coach_get.
// Admin e direttori: la squadra scelta (?squadra=), i direttori in sola lettura. L'organizzativo non ha la distinta.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { getMister } from '@/lib/mister';
import { vedeTutto } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { distintaNuova, nomiMister, type Foglio } from '@/lib/distinta';
import { DistintaForm } from '@/components/DistintaForm';

type Squadra = { id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean; coaches?: { name?: string }[]; coach?: string };
type Giocatore = { id: string; name: string };

export default async function PaginaDistinta({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const profilo = await getProfilo();
  const mister = profilo ? null : await getMister();
  if (profilo && !vedeTutto(profilo.ruolo)) redirect(profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!profilo && !mister) redirect('/');
  if (mister?.squadra.organizza) redirect('/modulistica/programma');
  const supabase = await createClient();

  let squadre: Squadra[] = [], squadra: Squadra | undefined, foglio: Foglio = {}, giocatori: Giocatore[] = [], errore = '';
  if (mister) {
    squadra = mister.squadra;
    const [sh, ro] = await Promise.all([
      supabase.rpc('coach_leggi', { p_pin: mister.pin, p_path: 'sheet/' + squadra.id }),
      supabase.rpc('coach_get', { p_pin: mister.pin, p_path: 'roster/' + squadra.id }),
    ]);
    errore = sh.error?.message ?? ro.error?.message ?? '';
    foglio = sh.data?.data ?? {};
    giocatori = ro.data?.players ?? [];
  } else {
    const { data: t } = await supabase.from('docs').select('data').eq('path', 'shared/teams').maybeSingle();
    squadre = ((t?.data?.items ?? []) as Squadra[]).filter((x) => !x.organizza && !x.vedeTutte);
    const { squadra: scelta } = await searchParams;
    squadra = squadre.find((x) => x.id === scelta) ?? squadre[0];
    if (squadra) {
      const { data, error } = await supabase.from('docs').select('path, data').in('path', ['sheet/' + squadra.id, 'roster/' + squadra.id]);
      errore = error?.message ?? '';
      foglio = data?.find((d) => d.path === 'sheet/' + squadra!.id)?.data ?? {};
      giocatori = data?.find((d) => d.path === 'roster/' + squadra!.id)?.data?.players ?? [];
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-4xl font-bold">Distinta</h1>
        <p className="mt-1 max-w-prose text-grigio">
          Per tornei e amichevoli omologate. Scegli i giocatori e completa i dati; quello che lasci vuoto resta da scrivere a penna sul foglio.
        </p>
      </div>
      {squadre.length > 0 && (
        <form method="GET" className="flex flex-wrap items-end gap-2">
          <label className="min-w-56 flex-1 sm:max-w-xs">
            <span className="mb-1 block text-sm font-semibold text-grigio">Squadra</span>
            <select name="squadra" defaultValue={squadra?.id} className="campo">
              {squadre.map((s) => <option key={s.id} value={s.id}>{s.category || s.name}</option>)}
            </select>
          </label>
          <button className="bottone">Apri</button>
        </form>
      )}
      {errore && <p className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">Dati non disponibili: {errore}</p>}
      {squadra ? (
        <DistintaForm
          key={squadra.id}
          squadraId={squadra.id}
          categoria={squadra.category || squadra.name || ''}
          giocatori={giocatori.slice().sort((a, b) => a.name.localeCompare(b.name, 'it'))}
          foglio={foglio}
          iniziale={foglio.distinta ?? distintaNuova(nomiMister(squadra))}
          soloLettura={profilo?.ruolo === 'direttore'}
        />
      ) : (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">Nessuna squadra.</p>
      )}
    </div>
  );
}
