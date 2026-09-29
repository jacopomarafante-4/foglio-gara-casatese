// Calendario → Avvisi (nell'app dalla tappa 3): admin, direttori e responsabile organizzativo (shared/avvisi).
// ?evento=<id>: bozza pronta per un evento della società ("Scrivi un avviso per questo evento" in Tutte le squadre).
import { redirect } from 'next/navigation';
import { vedeTutto } from '@/lib/ruoli';
import { oggiIso } from '@/lib/utili';
import { chiEntra, leggiDocs, organizza, squadreDelPortale } from '@/lib/portale-dati';
import { testoEvento } from '@/lib/calendario-portale';
import type { Evento, SquadraCal } from '@/lib/programma';
import { Avvisi, type Avviso } from '@/components/calendario/Avvisi';

export default async function PaginaAvvisi({ searchParams }: { searchParams: Promise<{ evento?: string }> }) {
  const chi = await chiEntra();
  if (chi.profilo && !vedeTutto(chi.profilo.ruolo)) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  if (!organizza(chi)) redirect('/calendari/squadra');   // i mister vedono gli avvisi nella Home

  const [docs, teams] = await Promise.all([leggiDocs(chi, ['shared/avvisi', 'shared/eventi']), squadreDelPortale(chi)]);
  const squadre: SquadraCal[] = teams.filter((t) => !t.organizza && !t.vedeTutte).map((t) => ({ ...t, matches: [] }));
  const { evento } = await searchParams;
  const ev = evento ? ((docs['shared/eventi']?.items ?? []) as Evento[]).find((e) => e.id === evento) : undefined;
  const bozza = ev ? { modello: 'evento', squadre: [...(ev.squadre ?? [])], titolo: ev.titolo || 'Evento', testo: testoEvento(ev, squadre) } : null;

  return (
    <div className="space-y-5">
      <h1 className="font-display text-4xl font-bold">Avvisi</h1>
      <Avvisi avvisi={(docs['shared/avvisi']?.items ?? []) as Avviso[]} squadre={squadre} oggi={oggiIso()} bozzaIniziale={bozza}
        autore={chi.mister ? chi.mister.nome : 'Società'} />
    </div>
  );
}
