// Calendario delle squadre, unito a Gare in un unico pannello (0057): questo indirizzo resta per i link già in giro
// (es. salvati nel browser) e rimanda alla scheda "Calendario squadre" dentro /gare.
import { redirect } from 'next/navigation';

export default async function CalendarioSquadreRedirect({ searchParams }: { searchParams: Promise<{ squadra?: string; periodo?: string }> }) {
  const { squadra, periodo } = await searchParams;
  const sp = new URLSearchParams({ vista: 'calendario', ...(squadra ? { squadra } : {}), ...(periodo ? { periodo } : {}) });
  redirect(`/gare?${sp}`);
}
