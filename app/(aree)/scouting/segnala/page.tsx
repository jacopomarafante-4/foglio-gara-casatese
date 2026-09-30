// Scouting → Segnala per i mister (nell'app dalla tappa 3): stesso modulo dello Scouting, salvato con coach_segnala.
// La segnalazione arriva allo scouting del club firmata "<mister> · <categoria>".
import { GiaInLista } from '@/components/GiaInLista';
import { ModuloSegnalazione } from '@/components/ModuloSegnalazione';
import { apriScoutingMister, giocatoriDelMister, societaDelMister } from '@/lib/scouting-mister';
import { segnalaMister } from '../actions';

export default async function SegnalaMister({ searchParams }: { searchParams: Promise<{ ok?: string; errore?: string }> }) {
  const mister = await apriScoutingMister('segnala');
  const { ok, errore } = await searchParams;
  const [societa, giocatori] = await Promise.all([societaDelMister(mister), giocatoriDelMister(mister)]);
  // per "Già in lista": gli osservati della sua annata (i soli che il mister può leggere)
  const elenco = (giocatori ?? []).map((g) => ({ id: g.id, cognome: g.cognome, nome: g.nome, annata: g.annata, societa: g.societa ? { nome: g.societa } : null }));
  return (
    <div className="max-w-xl">
      <h1 className="font-display text-4xl font-bold">Segnala un giocatore</h1>
      <p className="mt-3 text-grigio">Dall’alto in basso: servono solo le voci con *, il resto se l’hai visto. Arriva allo scouting del club firmata da te.</p>
      <ModuloSegnalazione action={segnalaMister} formId="segnala-mister" societa={societa} ok={ok} errore={errore}
        giaInLista={<GiaInLista formId="segnala-mister" elenco={elenco} valuta="/scouting/valuta/:id" />}
        testoSalva="Invia allo scouting" sottoChi="Se non sai il nome, descrivilo: lo completeranno loro." />
    </div>
  );
}
