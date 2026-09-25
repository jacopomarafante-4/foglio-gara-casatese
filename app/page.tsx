import Image from 'next/image';
import Link from 'next/link';
import { AccessoForm } from './AccessoForm';
import { esci } from '@/app/auth/actions';
import { getProfilo } from '@/lib/auth';
import { Striscia } from '@/components/Striscia';

/**
 * Pagina d'ingresso unica: tutti digitano il PIN e il PIN dice chi sei
 * (mister → Portale squadre, scout → Scouting, dirigente → sceglie, admin → email e password).
 * Il PIN si chiede sempre, anche se c'è già una sessione aperta (niente accesso automatico):
 * solo l'admin o un dirigente già entrati vedono la scelta tra i due pannelli.
 */
export default async function Ingresso({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const [{ next }, profilo] = await Promise.all([searchParams, getProfilo()]);
  // Admin e dirigenti già entrati scelgono il pannello; tutti gli altri vedono il PIN
  const admin = profilo?.ruolo === 'admin' || (profilo?.ruolo === 'direttore' && profilo.attivo);

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="bg-blu px-6 pb-10 pt-16 text-white">
        <div className="mx-auto flex max-w-sm items-center gap-4">
          <span className="shrink-0 rounded-xl bg-white p-1 shadow">
            <Image src="/portale/casatese-logo.png" alt="" width={56} height={56} className="rounded-lg" priority />
          </span>
          <div>
            <h1 className="font-display text-4xl font-bold leading-none">Academy Casatese Merate</h1>
            <p className="mt-2 text-white/80">{admin ? 'Scegli il pannello.' : 'Entra con il tuo PIN.'}</p>
          </div>
        </div>
      </div>
      <Striscia />

      <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
        {admin ? (
          <div className="space-y-4">
            <a href="/portale/" className="block rounded-2xl border border-linea bg-white p-6 hover:border-blu">
              <span className="block font-display text-3xl font-bold leading-tight">Portale squadre</span>
              <span className="mt-2 block text-grigio">Squadre, rose, gare, presenze e statistiche.</span>
            </a>
            <Link href="/home" className="block rounded-2xl border border-linea bg-white p-6 hover:border-blu">
              <span className="block font-display text-3xl font-bold leading-tight">Scouting</span>
              <span className="mt-2 block text-grigio">Segnalazioni, valutazioni e gare da vedere.</span>
            </Link>
            <form action={esci}>
              <button className="w-full py-2 text-sm font-medium text-grigio">Esci</button>
            </form>
          </div>
        ) : (
          <>
            <AccessoForm next={next} />
            <p className="mt-6 text-sm text-grigio">
              Mister, scout e direttori: il tuo PIN personale. Non ce l’hai? Chiedilo all’admin.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
