// Scouting → Valuta per i mister (tappa 3): stesso modulo dello Scouting, salvato con coach_valuta. Ci si arriva da
// Giocatori ("Valuta") o da una segnalazione di un giocatore già in lista (gia=1, quello che si era scritto nel commento).
// Il mister legge solo gli osservati della sua annata: per un giocatore di un'altra annata nome e annata arrivano
// nell'indirizzo, da coach_segnala.
import Link from 'next/link';
import { ModuloValutazione } from '@/components/ModuloValutazione';
import { apriScoutingMister, giocatoriDelMister } from '@/lib/scouting-mister';
import { valutaMister } from '../../actions';

export default async function ValutaMister({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ errore?: string; gia?: string; nota?: string; contesto?: string; data?: string; nome?: string; annata?: string; societa?: string }>;
}) {
  const mister = await apriScoutingMister('giocatori');
  const { id } = await params;
  const q = await searchParams;
  const g = (await giocatoriDelMister(mister))?.find((x) => x.id === id);
  const nome = (g ? [g.cognome, g.nome].filter(Boolean).join(' ') || g.descrizione : q.nome) || 'Il giocatore';
  const annata = g ? String(g.annata) : q.annata ?? '';
  const societa = g ? g.societa : q.societa;
  return (
    <div className="max-w-2xl">
      <Link href="/scouting/giocatori" className="text-sm text-grigio hover:text-blu">‹ Giocatori</Link>
      <h1 className="mt-2 font-display text-4xl font-bold">Valutazione</h1>
      <p className="text-grigio">{[nome, annata, societa].filter(Boolean).join(' – ')}</p>
      <ModuloValutazione action={valutaMister} nascosti={{ id, nome, annata }} titolo={nome} gia={!!q.gia} errore={q.errore}
        ruolo={g?.ruolo} annata={Number(annata) || null} contesto={q.contesto} data={q.data} nota={q.nota} />
    </div>
  );
}
