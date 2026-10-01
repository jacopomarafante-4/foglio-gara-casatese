// Esercitazioni → un esercizio: scheda e lavagna (solo l'admin, RLS is_admin())
import { notFound, redirect } from 'next/navigation';
import { chiEntra } from '@/lib/portale-dati';
import { createClient } from '@/lib/supabase/server';
import type { Esercizio } from '@/lib/esercizi';
import { SchedaEsercizio } from '@/components/esercizi/SchedaEsercizio';
import { Avviso } from '@/components/Avviso';

export default async function PaginaEsercizio({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; errore?: string }> }) {
  const chi = await chiEntra();
  if (chi.profilo?.ruolo !== 'admin') redirect('/inizio');
  const [{ id }, q] = await Promise.all([params, searchParams]);
  const db = await createClient();
  const { data } = await db.from('esercizi').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const e = data as Esercizio;
  const { data: o } = e.da ? await db.from('esercizi').select('id, titolo, autore').eq('id', e.da).maybeSingle() : { data: null };
  return (
    <div className="space-y-3">
      <Avviso ok={q.ok} errore={q.errore} />
      <SchedaEsercizio key={e.id} iniziale={{ ...e, lunghezza: e.lunghezza === null ? null : Number(e.lunghezza), larghezza: e.larghezza === null ? null : Number(e.larghezza),
        minuti: e.minuti === null ? null : Number(e.minuti), recupero: e.recupero === null ? null : Number(e.recupero), lavagna: e.lavagna ?? {} }} origine={o} />
    </div>
  );
}
