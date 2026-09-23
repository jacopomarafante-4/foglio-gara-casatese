import { LoginForm } from './LoginForm';
import { Striscia } from '@/components/Striscia';

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-dvh flex-col">
      <div className="bg-blu px-6 pb-10 pt-16 text-white">
        <div className="mx-auto max-w-sm">
          <h1 className="font-display text-5xl font-bold leading-none">Scouting Hub</h1>
          <p className="mt-3 text-white/80">Segnala, valuta e segui i giocatori con tutto il team.</p>
        </div>
      </div>
      <Striscia />
      <div className="mx-auto w-full max-w-sm flex-1 px-6 py-10">
        <LoginForm next={next} />
        <p className="mt-6 text-sm text-grigio">
          Non hai un account? Te lo crea l’admin del settore giovanile.
        </p>
      </div>
    </main>
  );
}
