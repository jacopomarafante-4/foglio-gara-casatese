'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { pannelloIniziale, puoAccedere, type Ruolo } from '@/lib/ruoli';

export type StatoForm = { errore?: string; ok?: string };

/** Pagina d'ingresso: `passo` = serve il secondo passaggio admin, `vai` = pagina da aprire */
export type StatoAccesso = { errore?: string; passo?: 'admin'; pin?: string; vai?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Pannello giusto per chi ha appena fatto l'accesso (null = non può entrare così) */
async function pannello(supabase: Supabase, userId: string, next: string) {
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', userId).single();
  const ruolo = (data?.ruolo ?? null) as Ruolo | null;
  if (!ruolo || !puoAccedere(ruolo)) return null;
  // Solo percorsi interni, per sicurezza
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return pannelloIniziale(ruolo);
}

/**
 * Accesso unico col PIN. Il PIN dice chi sei:
 * - PIN admin (PIN_ADMIN, solo sul server): poi email e password;
 * - PIN di una squadra: Portale squadre come mister;
 * - PIN personale (scout, direttori: tabella codici_accesso): Scouting Hub.
 */
export async function accedi(_prev: StatoAccesso, formData: FormData): Promise<StatoAccesso> {
  const pin = String(formData.get('pin') ?? '').trim();
  const next = String(formData.get('next') ?? '');
  if (!pin) return { errore: 'Inserisci il tuo PIN.' };

  const supabase = await createClient();

  const pinAdmin = process.env.PIN_ADMIN;
  if (pinAdmin && pin === pinAdmin) {
    const email = String(formData.get('email') ?? '').trim().toLowerCase();
    const password = String(formData.get('password') ?? '');
    if (!email || !password) return { passo: 'admin', pin };
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { passo: 'admin', pin, errore: 'Email o password non corrette.' };
    const vai = await pannello(supabase, data.user.id, next);
    if (!vai) {
      await supabase.auth.signOut({ scope: 'local' });
      return { passo: 'admin', pin, errore: 'Questo account non ha accesso. Contatta l’admin.' };
    }
    return { vai };
  }

  // PIN della squadra: il Portale apre la squadra dal link (#squadra=PIN)
  const { data: squadra } = await supabase.rpc('coach_team', { p_pin: pin });
  if (squadra) {
    await supabase.auth.signOut({ scope: 'local' }); // su un telefono condiviso non resta aperto un altro account
    return { vai: `/portale/#squadra=${encodeURIComponent(pin)}` };
  }

  // PIN personale: il PIN è anche la password dell'account
  const { data: email } = await supabase.rpc('email_per_pin', { p_pin: pin });
  if (typeof email === 'string' && email) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pin });
    if (!error) {
      const vai = await pannello(supabase, data.user.id, next);
      if (vai) return { vai };
      await supabase.auth.signOut({ scope: 'local' });
      return { errore: 'Il tuo account non ha accesso. Contatta l’admin.' };
    }
  }

  return { errore: 'PIN non riconosciuto. Controlla e riprova.' };
}

export async function esci() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/');
}

export async function cambiaPassword(_prev: StatoForm, formData: FormData): Promise<StatoForm> {
  const nuova = String(formData.get('password') ?? '');
  const conferma = String(formData.get('conferma') ?? '');

  if (nuova.length < 8) return { errore: 'La password deve avere almeno 8 caratteri.' };
  if (!/[0-9]/.test(nuova) || !/[a-zA-Z]/.test(nuova))
    return { errore: 'Usa almeno una lettera e un numero.' };
  if (nuova !== conferma) return { errore: 'Le due password non coincidono.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: nuova });
  if (error) return { errore: `Password non aggiornata: ${error.message}` };

  return { ok: 'Password aggiornata. Dal prossimo accesso usa quella nuova.' };
}
