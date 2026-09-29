// =====================================================================
// Controllo quotidiano del backup (attività di macOS it.academycasatese.backup: ogni giorno alle 9 e all'accensione)
// Uso: node --env-file=.env.local scripts/controlla-backup.mjs [--prova-avviso]
//
// - Se l'ultimo backup riuscito (private/backup/<data>/_riepilogo.json senza problemi) ha 7 giorni o più, lo rifà subito:
//   così un lunedì a Mac spento si recupera al primo giorno utile.
// - Se il backup fallisce, o il più recente riuscito ha più di 8 giorni, apre una finestra di avviso sul Mac
//   (resta finché non la si chiude) e lo scrive in private/backup/backup.log.
// =====================================================================
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const BASE = 'private/backup';
const GIORNO = 24 * 3600 * 1000;

function avviso(testo) {
  console.error(`⚠️ ${new Date().toISOString()} ${testo}`);
  const msg = testo.replace(/["\\]/g, '');
  spawnSync('osascript', ['-e', `display alert "Backup Academy Casatese" message "${msg}" as critical`], { timeout: 6 * 3600 * 1000 });
}

async function ultimoRiuscito() {
  let cartelle = [];
  try { cartelle = (await readdir(BASE, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name).sort().reverse(); } catch { /* cartella assente */ }
  for (const c of cartelle) {
    try {
      const r = JSON.parse(await readFile(join(BASE, c, '_riepilogo.json'), 'utf8'));
      if (!r.problemi) return new Date(r.quando);
    } catch { /* backup interrotto: si guarda il precedente */ }
  }
  return null;
}

if (process.argv.includes('--prova-avviso')) { avviso('Prova dell’avviso: se leggi questo, gli avvisi funzionano. Nessun problema.'); process.exit(0); }

let ultimo = await ultimoRiuscito();
const giorni = (d) => (d ? (Date.now() - d.getTime()) / GIORNO : Infinity);

if (giorni(ultimo) >= 7) {
  console.log(`${new Date().toISOString()} Ultimo backup riuscito: ${ultimo ? `${giorni(ultimo).toFixed(1)} giorni fa` : 'nessuno'}. Lo rifaccio.`);
  const r = spawnSync(process.execPath, ['--env-file=.env.local', 'scripts/backup.mjs'], { stdio: 'inherit', timeout: 30 * 60 * 1000 });
  if (r.status !== 0) avviso('Il backup del database NON è riuscito (rete assente o altro errore). Riprova con: npm run backup');
  ultimo = await ultimoRiuscito();
}
if (giorni(ultimo) > 8) avviso(`L’ultimo backup riuscito ha ${ultimo ? Math.floor(giorni(ultimo)) + ' giorni' : 'più di 8 giorni'}. Lancia: npm run backup`);
else console.log(`${new Date().toISOString()} Backup a posto: l’ultimo riuscito ha ${giorni(ultimo).toFixed(1)} giorni.`);
