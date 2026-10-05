// Pagine della Squadra nell'app (tappa 3): chi può entrare e quale squadra si apre. Mister (non l'organizzativo, che non ha la
// Squadra): la sua (o una delle sue, un PIN per più squadre, 0050); admin e direttori: quella scelta (?squadra=), i direttori in
// sola lettura tranne nelle squadre di cui sono anche mister; preparatori: tutte, le altre in sola lettura con i portieri da segnare.
// Solo sul server.
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
  // direttore che è anche mister (0050): nelle sue squadre scrive come un mister
  const mie = new Set((chi.misterDi?.squadre ?? []).map((t) => t.id));
  // preparatore dei portieri sulla squadra di un altro: sola lettura, ma segna i portieri (coach_portiere, 0050) nelle squadre
  // delle sue categorie (coaches[].eta, come datiPreparatore in lib/portale-dati.ts; il database lo ricontrolla, 0053)
  const altraDelPreparatore = !!chi.mister?.squadra.vedeTutte && !!squadra && squadra.id !== chi.mister.squadra.id;
  const etaPrep = (chi.mister?.squadra.coaches ?? []).find((c) => c.name && c.name === chi.mister?.nome)?.eta;
  const entroCategorie = !Array.isArray(etaPrep) || !etaPrep.length || (!!squadra && etaPrep.includes(etaSquadra(squadra)));
  const conParametro = !!chi.profilo || !!chi.mister?.squadra.vedeTutte;
  return {
    chi, squadre, squadra, eta: squadra ? etaSquadra(squadra) : 99,
    admin: chi.profilo?.ruolo === 'admin',
    soloLettura: (chi.profilo?.ruolo === 'direttore' && !(squadra && mie.has(squadra.id))) || altraDelPreparatore,
    soloPortieri: altraDelPreparatore,
    /** preparatore su un'altra squadra DELLE SUE CATEGORIE: può segnare presenze e tabellini dei portieri */
    soloPortieriScrivibile: altraDelPreparatore && entroCategorie,
    /* mister di più squadre: la scelta passa da /api/squadra (cookie) */
    sceltaPerMister: !!chi.mister && !chi.mister.squadra.vedeTutte,
    /* ?squadra= da aggiungere ai link tra le pagine (staff e preparatori) */
    conSquadra: (href: string) => (conParametro && squadra ? `${href}${href.includes('?') ? '&' : '?'}squadra=${encodeURIComponent(squadra.id)}` : href),
  };
}
