'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type StatoForm = { errore?: string; ok?: string };

export async function accedi(_prev: StatoForm, formData: FormData): Promise<StatoForm> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const next = String(formData.get('next') ?? '');

  if (!email || !password) return { errore: 'Inserisci email e password.' };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { errore: 'Email o password non corrette. Riprova o chiedi all’admin di reimpostarla.' };

  // Solo percorsi interni, per sicurezza
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/home');
}

export async function esci() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
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
