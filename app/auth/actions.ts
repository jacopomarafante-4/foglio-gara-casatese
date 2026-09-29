'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { pannelloIniziale, puoAccedere, type Ruolo } from '@/lib/ruoli';
import { COOKIE_MISTER, creaTessera, opzioniCookieMister } from '@/lib/tessera';
import { NELL_APP } from '@/lib/condivisi';

export type StatoForm = { errore?: string; ok?: string };

/** Pagina d'ingresso: `passo` = serve il secondo passaggio admin, `vai` = pagina da aprire */
export type StatoAccesso = { errore?: string; passo?: 'admin'; pin?: string; vai?: string };

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Pannello giusto per chi ha appena fatto l'accesso (null = non può entrare così) */
async function pannello(supabase: Supabase, userId: string, next: string) {
  const { data } = await supabase.from('profiles').select('ruolo').eq('id', userId).single();
  const ruolo = (data?.ruolo ?? null) as Ruolo | null;
  // Segreteria: solo la sua area (/segreteria), non lo Scouting
  if (ruolo === 'segreteria') return '/segreteria';
  if (!ruolo || !puoAccedere(ruolo)) return null;
  // Solo percorsi interni, per sicurezza
  if (next.startsWith('/') && !next.startsWith('//')) return next;
  return pannelloIniziale(ruolo);
}

/**
 * Accesso unico col PIN. Il PIN dice chi sei:
 * - PIN admin (PIN_ADMIN, solo sul server): poi email e password;
 * - PIN di un mister (o il vecchio PIN di squadra): Portale squadre, solo quella squadra;
 * - PIN di una famiglia (tesserati, 0031): Portale, solo quel ragazzo;
 * - PIN personale (scout, direttori, segreteria: tabella codici_accesso): Scouting Hub o Portale.
 * Il tipo di PIN lo dice tipo_pin() con UN solo controllo (e un solo errore annotato se il PIN non esiste).
 */
export async function accedi(_prev: StatoAccesso, formData: FormData): Promise<StatoAccesso> {
  const pin = String(formData.get('pin') ?? '').trim();
  const next = String(formData.get('next') ?? '');
  if (!pin) return { errore: 'Inserisci il tuo PIN.' };

  const supabase = await createClient();
  // Un nuovo PIN toglie la tessera di un mister entrato prima (telefono condiviso); la si ridà sotto se è ancora un mister
  const biscotti = await cookies();
  biscotti.delete(COOKIE_MISTER);

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

  // Troppi PIN sbagliati in poco tempo: il database blocca le verifiche per qualche minuto (0015)
  const BLOCCO = { errore: 'Troppi PIN sbagliati da parte di qualcuno: riprova tra qualche minuto.' };

  const { data: tipoDb, error: erroreTipo } = await supabase.rpc('tipo_pin', { p_pin: pin });
  if (erroreTipo?.code === 'PT429') return BLOCCO;
  let tipo = tipoDb as string | null;
  if (erroreTipo) {
    // tipo_pin non c'è ancora (migrazione 0031 non eseguita): come prima, prima mister poi PIN personale
    const { data: squadra, error: erroreSquadra } = await supabase.rpc('coach_team', { p_pin: pin });
    if (erroreSquadra?.code === 'PT429') return BLOCCO;
    tipo = squadra ? 'mister' : 'personale';
  }
  // PIN di un mister o della squadra: il Portale apre la squadra dal link (#squadra=PIN)
  if (tipo === 'mister') {
    await supabase.auth.signOut({ scope: 'local' }); // su un telefono condiviso non resta aperto un altro account
    // Tessera per le pagine del Portale portate nell'app (lib/mister.ts)
    const tessera = await creaTessera(pin);
    if (tessera) biscotti.set(COOKIE_MISTER, tessera, opzioniCookieMister);
    // Arrivava da una di quelle pagine: si passa dal Portale (che tiene il PIN) con la sua scheda, e lui la riapre
    const scheda = Object.entries(NELL_APP).find(([, percorso]) => percorso === next)?.[0];
    return { vai: `/portale/#squadra=${encodeURIComponent(pin)}${scheda ? '/' + scheda : ''}` };
  }
  // PIN di una famiglia: il Portale apre la pagina del ragazzo (#famiglia=PIN)
  if (tipo === 'famiglia') {
    await supabase.auth.signOut({ scope: 'local' });
    return { vai: `/portale/#famiglia=${encodeURIComponent(pin)}` };
  }
  if (tipo !== 'personale') return { errore: 'PIN non riconosciuto. Controlla e riprova.' };

  // PIN personale: il PIN è anche la password dell'account
  const { data: email, error: errorePin } = await supabase.rpc('email_per_pin', { p_pin: pin });
  if (errorePin?.code === 'PT429') return BLOCCO;
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
  (await cookies()).delete(COOKIE_MISTER);
  // ?uscito=1: la pagina d'ingresso toglie anche il PIN che il Portale tiene nella scheda del browser
  redirect('/?uscito=1');
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
