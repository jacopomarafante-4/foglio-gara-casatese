// Pagine della Squadra nell'app (tappa 3): chi può entrare e quale squadra si apre. Mister (non l'organizzativo, che non ha la
// Squadra): la sua; admin e direttori: quella scelta (?squadra=), i direttori in sola lettura. Solo sul server.
import { redirect } from 'next/navigation';
import { vedeTutto } from '@/lib/ruoli';
import { chiEntra, squadraDellaPagina } from '@/lib/portale-dati';
import { etaSquadra } from '@/lib/programma';

export async function apriSquadra(scelta?: string) {
  const chi = await chiEntra();
  if (chi.profilo && !vedeTutto(chi.profilo.ruolo)) redirect(chi.profilo.ruolo === 'segreteria' ? '/segreteria' : '/home');
  if (!chi.profilo && !chi.mister) redirect('/');
  if (chi.mister?.squadra.organizza) redirect('/inizio');
  const { squadre, squadra } = await squadraDellaPagina(chi, scelta);
  return {
    chi, squadre, squadra, eta: squadra ? etaSquadra(squadra) : 99,
    admin: chi.profilo?.ruolo === 'admin', soloLettura: chi.profilo?.ruolo === 'direttore',
    /* ?squadra= da aggiungere ai link tra le pagine (solo per lo staff) */
    conSquadra: (href: string) => (chi.profilo && squadra ? `${href}${href.includes('?') ? '&' : '?'}squadra=${encodeURIComponent(squadra.id)}` : href),
  };
}
