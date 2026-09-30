import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getProfilo } from '@/lib/auth';
import { puoSegnalare } from '@/lib/ruoli';
import { ModuloValutazione } from '@/components/ModuloValutazione';
import { salvaValutazione } from '../../actions';

export default async function Valuta({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ errore?: string; gia?: string; nota?: string; contesto?: string; data?: string }>;
}) {
  const { id } = await params;
  // gia=1: arriva da una segnalazione di un giocatore già in lista (quello che si era scritto va nel commento)
  const { errore, gia, nota, contesto, data } = await searchParams;
  const profilo = (await getProfilo())!;
  if (!puoSegnalare(profilo.ruolo)) redirect(`/giocatori/${id}`);

  const supabase = await createClient();
  const { data: g } = await supabase
    .from('giocatori')
    .select('id, cognome, nome, descrizione, annata, ruolo_preciso')
    .eq('id', id)
    .maybeSingle();
  if (!g) notFound();

  const titolo = [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione;

  return (
    <div className="max-w-2xl">
      <Link href={`/giocatori/${g.id}`} className="text-sm text-grigio hover:text-blu">‹ {titolo}</Link>
      <h1 className="mt-2 font-display text-4xl font-bold">Valutazione</h1>
      <p className="text-grigio">{titolo} – {g.annata}</p>

      <ModuloValutazione action={salvaValutazione} nascosti={{ id: g.id }} titolo={titolo ?? ''} gia={!!gia} errore={errore}
        ruoloPreciso={g.ruolo_preciso} contesto={contesto} data={data} nota={nota} />
    </div>
  );
}
