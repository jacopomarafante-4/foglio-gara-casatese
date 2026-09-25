import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profilo } from '@/lib/ruoli';

/** Profilo dell'utente loggato (una sola query per richiesta) */
export const getProfilo = cache(async (): Promise<Profilo | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('id, email, nome, cognome, ruolo, annate, attivo')
    .eq('id', user.id)
    .single();

  return (data as Profilo) ?? null;
});
