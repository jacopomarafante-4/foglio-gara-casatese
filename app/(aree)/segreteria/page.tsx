// Segreteria → Tesserati (0031, 0033; nell'app dalla tappa 3): anagrafica, genitori, certificato, taglie, iscrizione, quote,
// documenti caricati dalle famiglie e PIN delle famiglie. La vedono admin, direttori e segreteria (gestisce_segreteria()).
// Dati di minori: stanno nelle tabelle protette tesserati / tesserati_dati, mai nei documenti del Portale.
import { redirect } from 'next/navigation';
import { getProfilo } from '@/lib/auth';
import { gestisceSegreteria } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { oggiIso } from '@/lib/utili';
import { Tesserati, type DocumentoFamiglia, type SquadraRosa, type Tesserato } from '@/components/Tesserati';

export default async function Segreteria() {
  const profilo = await getProfilo();
  if (!profilo) redirect('/inizio');   // mister con la tessera: qui non entra
  if (!gestisceSegreteria(profilo)) redirect('/home');
  const supabase = await createClient();
  const [rose, tess, docs] = await Promise.all([
    supabase.rpc('segreteria_rose'),
    supabase.from('tesserati').select('*, tesserati_dati(*)'),
    // senza il contenuto: si scarica uno alla volta (documento_scarica)
    supabase.from('documenti_tesserati')
      .select('id, tesserato_id, tipo, rata, descrizione, nome_file, mime, dimensione, caricato_il, stato, nota')
      .order('caricato_il', { ascending: false }),
  ]);

  return (
    <div className="space-y-5">
      {rose.error || tess.error ? (
        <p className="rounded-xl border border-dashed border-linea p-8 text-center text-grigio">
          Segreteria non disponibile: {(rose.error ?? tess.error)!.message}
        </p>
      ) : (
        <Tesserati
          squadre={((rose.data as SquadraRosa[] | null) ?? []).filter((s) => s.players?.length)}
          iniziali={(tess.data as Tesserato[] | null) ?? []}
          documenti={(docs.data as DocumentoFamiglia[] | null) ?? []}
          oggi={oggiIso()}
        />
      )}
    </div>
  );
}
