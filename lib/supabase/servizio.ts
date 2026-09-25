// Client con la chiave di servizio (aggira la RLS): SOLO lato server e SOLO in
// app/api/staff/route.ts, dopo aver verificato che chi chiama è admin o direttore.
// Serve perché il PIN di scout e direttori è anche la password del loro account.
import { createClient } from '@supabase/supabase-js';

export function createServiceClient() {
  const chiave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!chiave) throw new Error('Manca SUPABASE_SERVICE_ROLE_KEY');
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, chiave, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
