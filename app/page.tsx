import Image from 'next/image';
import { redirect } from 'next/navigation';
import { AccessoForm } from './AccessoForm';
import { getProfilo } from '@/lib/auth';
import { Striscia } from '@/components/Striscia';

const MANUALI = [
  ['generale', 'Generale'],
  ['mister', 'Mister'],
  ['scout', 'Scout'],
  ['direttori', 'Direttori'],
];

/** Linee di un campo da calcio in trasparenza, dietro la scheda d'ingresso */
function CampoSfondo() {
  return (
    <svg aria-hidden viewBox="0 0 680 1050" preserveAspectRatio="xMidYMid slice"
      className="pointer-events-none absolute inset-0 h-full w-full text-white opacity-[0.07]">
      <g fill="none" stroke="currentColor" strokeWidth="4">
        <rect x="20" y="20" width="640" height="1010" rx="6" />
        <line x1="20" y1="525" x2="660" y2="525" />
        <circle cx="340" cy="525" r="92" />
        <rect x="138" y="20" width="404" height="165" />
        <rect x="248" y="20" width="184" height="55" />
        <rect x="138" y="865" width="404" height="165" />
        <rect x="248" y="975" width="184" height="55" />
        <path d="M 266 185 A 92 92 0 0 0 414 185" />
        <path d="M 266 865 A 92 92 0 0 1 414 865" />
      </g>
      <circle cx="340" cy="525" r="6" fill="currentColor" />
    </svg>
  );
}

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
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-blu-scuro px-4 py-10">
      <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(0,61,165,0.9),transparent_65%)]" />
      <CampoSfondo />

      <div className="relative w-full max-w-sm">
        <div className="overflow-hidden rounded-3xl bg-white shadow-2xl shadow-black/40">
          <Striscia />
          <div className="px-7 pb-7 pt-8">
            <div className="flex flex-col items-center text-center">
              <span className="grid size-24 place-items-center rounded-full bg-white shadow-md ring-4 ring-carta">
                <Image src="/portale/casatese-logo.png" alt="Stemma Academy Casatese Merate" width={72} height={72} priority />
              </span>
              <h1 className="mt-4 font-display text-3xl font-bold leading-none text-inchiostro">Academy Casatese Merate</h1>
              <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-oro">Settore giovanile</p>
            </div>

            <div className="mt-7">
              <AccessoForm next={next} />
            </div>
          </div>

          <div className="border-t border-linea bg-carta px-7 py-4">
            <p className="text-center text-xs font-semibold uppercase tracking-wide text-grigio">Istruzioni</p>
            <div className="mt-2 flex flex-wrap justify-center gap-2">
              {MANUALI.map(([file, nome]) => (
                <a key={file} href={`/manuali/Manuale_${file}.pdf`} target="_blank" rel="noreferrer"
                  className="rounded-full border border-linea bg-white px-3 py-1.5 text-sm font-medium text-blu hover:border-blu">
                  {nome}
                </a>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-5 text-center text-sm text-white/60">Portale squadre · Scouting</p>
      </div>
    </main>
  );
}
