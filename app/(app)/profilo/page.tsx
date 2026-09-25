import { getProfilo } from '@/lib/auth';
import { ETICHETTA_RUOLO, nomeCompleto } from '@/lib/ruoli';
import { PasswordForm } from './PasswordForm';

export default async function Profilo() {
  const profilo = (await getProfilo())!;

  return (
    <div className="max-w-md space-y-10">
      <section>
        <h1 className="font-display text-4xl font-bold">{nomeCompleto(profilo)}</h1>
        <p className="mt-1 text-grigio">
          {ETICHETTA_RUOLO[profilo.ruolo]} · {profilo.email}
        </p>
      </section>

      {profilo.ruolo !== 'admin' ? (
        <p className="text-grigio">
          Accedi con il tuo PIN personale. Se lo perdi o vuoi cambiarlo, chiedilo all’admin.
        </p>
      ) : (
        <section>
          <h2 className="font-display text-2xl font-bold">Cambia password</h2>
          <p className="mb-4 mt-1 text-sm text-grigio">
            Al primo accesso sostituisci la password temporanea ricevuta dall’admin.
          </p>
          <PasswordForm />
        </section>
      )}
    </div>
  );
}
