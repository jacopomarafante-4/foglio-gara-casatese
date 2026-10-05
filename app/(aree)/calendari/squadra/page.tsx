// La mia squadra, spostata dentro Squadra → Calendario: questo indirizzo resta per i link già in giro.
import { redirect } from 'next/navigation';

export default async function LaMiaSquadraRedirect({ searchParams }: { searchParams: Promise<{ squadra?: string }> }) {
  const { squadra } = await searchParams;
  redirect(squadra ? `/squadra/calendario?squadra=${encodeURIComponent(squadra)}` : '/squadra/calendario');
}
