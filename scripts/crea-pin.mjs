// =====================================================================
// Scouting Hub · Crea account "leggeri" con PIN numerico (no email vera)
// Per scout e direttori: si entra dalla pagina d'ingresso col solo PIN, che
// è anche la password dell'account. Resta visibile solo all'admin (Portale →
// Società → Team scouting), salvato in chiaro in public.codici_accesso.
// Nota: i direttori vedono i contatti delle famiglie; un PIN di 6 cifre è più
// debole di una password (scelta del club). Mai per l'admin: usa PIN_ADMIN + password.
//
// Uso:
//   node scripts/crea-pin.mjs scripts/pin-da-creare.json
// Il file JSON è un array di { nome, cognome, email, ruolo }.
// =====================================================================
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error('❌ Mancano NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}
const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const file = process.argv[2];
if (!file) {
  console.error('Uso: node scripts/crea-pin.mjs percorso/al/file.json');
  process.exit(1);
}

function pinNumerico() {
  return String(Math.floor(100000 + Math.random() * 900000)); // 6 cifre
}

const richieste = JSON.parse(await readFile(file, 'utf8'));
const risultati = [];

for (const u of richieste) {
  const email = u.email.trim().toLowerCase();
  const pin = pinNumerico();
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: pin,
    email_confirm: true,
    user_metadata: { nome: u.nome, cognome: u.cognome },
    app_metadata: { ruolo: u.ruolo ?? 'scout' },
  });
  if (error) {
    const giaEsiste = /already|registered|exists/i.test(error.message);
    console.log(giaEsiste ? `↷  ${email}: esiste già, saltato` : `❌ ${email}: ${error.message}`);
    continue;
  }

  await supabase.from('profiles').update({ ruolo: u.ruolo ?? 'scout' }).eq('id', data.user.id);
  await supabase.from('codici_accesso').insert({ profilo_id: data.user.id, pin, nota: `${u.nome} ${u.cognome}` });

  risultati.push({ nome: `${u.nome} ${u.cognome}`, email, pin });
  console.log(`✅ ${email} creato`);
}

if (risultati.length) console.table(risultati);
