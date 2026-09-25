import Image from 'next/image';
import { redirect } from 'next/navigation';
import { AccessoForm } from './AccessoForm';
import { getProfilo } from '@/lib/auth';
import { Striscia } from '@/components/Striscia';

/**
 * Pagina d'ingresso unica: tutti digitano il PIN e il PIN dice chi sei
 * (mister → Portale squadre, scout → Scouting, direttore → Portale, admin → email e password → Portale).
 * Il PIN si chiede sempre, anche se c'è già una sessione aperta (niente accesso automatico);
 * solo admin e direttori già entrati tornano dritti al Portale, dove c'è tutto (Scouting compreso).
 */
export default async function Ingresso({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; pin?: string }>;
}) {
  const [{ next, pin }, profilo] = await Promise.all([searchParams, getProfilo()]);
  // ?pin=1: il Portale ha rimandato qui (sessione non valida per lui) → PIN, niente giro di rimandi
  if (!pin && (profilo?.ruolo === 'admin' || (profilo?.ruolo === 'direttore' && profilo.attivo))) redirect('/portale/');

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="bg-blu px-6 pb-10 pt-16 text-white">
        <div className="mx-auto flex max-w-sm items-center gap-4">
          <span className="shrink-0 rounded-xl bg-white p-1 shadow">
            <Image src="/portale/casatese-logo.png" alt="" width={56} height={56} className="rounded-lg" priority />
          </span>
          <div>
            <h1 className="font-display text-4xl font-bold leading-none">Academy Casatese Merate</h1>
            <p className="mt-2 text-white/80">Entra con il tuo PIN.</p>
          </div>
        </div>
      </div>
      <Striscia />

      <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
        <AccessoForm next={next} />
        <p className="mt-6 text-sm text-grigio">
          Mister, scout e direttori: il tuo PIN personale. Non ce l’hai? Chiedilo all’admin.
        </p>
      </div>
    </main>
  );
}
