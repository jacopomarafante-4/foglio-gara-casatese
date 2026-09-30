// Quale collegamento con Google Calendar usare (solo sul server): prima quello fatto dall'app ("Collega a Google Calendar",
// 0049, letto con google_leggi coi permessi di chi chiama), altrimenti l'account di servizio delle variabili d'ambiente.
import type { SupabaseClient } from '@supabase/supabase-js';
import { daAccountDiServizio, type Calendario, type Google } from '@/lib/google-calendar';
import { daCollegamento, oauthConfigurato } from '@/lib/google-oauth';

export type RigaCollegamento = {
  token_cifrato?: string; account?: string | null; calendari?: Partial<Record<Calendario, string>>;
  ultima_lettura?: string | null; aggiornato?: string;
};

/** Il collegamento salvato (null se non c'è, se la 0049 non è ancora eseguita o se chi chiama non può leggerlo) */
export async function leggiCollegamento(db: SupabaseClient, pin?: string): Promise<RigaCollegamento | null> {
  const { data, error } = await db.rpc('google_leggi', pin ? { p_pin: pin } : {});
  return error ? null : ((data as RigaCollegamento | null) ?? null);
}

/** Stato per le pagine: `pronto` = si legge e scrive su Google; `daScegliere` = collegato ma mancano i calendari */
export async function statoGoogle(db: SupabaseClient, pin?: string) {
  const riga = await leggiCollegamento(db, pin);
  const google: Google | null = (await daCollegamento(riga)) ?? daAccountDiServizio();
  return {
    google, riga,
    pronto: !!google,
    collegato: !!riga?.token_cifrato,
    daScegliere: !!riga?.token_cifrato && !google,
    /* si può collegare dall'app: credenziali dell'app presenti (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, SEGRETO_SESSIONE) */
    collegabile: oauthConfigurato(),
  };
}
