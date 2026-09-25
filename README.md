# Academy Casatese Merate

Un'unica app web per il settore giovanile, con due pannelli:

- **Portale squadre**: rosa, calendario, gara (foglio gara, convocazioni, formazione, calci
  piazzati, tabellini), allenamento (presenze, test atletici) e statistiche. Per i mister e l'admin.
- **Scouting Hub**: segnalazioni dal campo, report a 4 aree (Tecnica, Motoria, Tattica, Mentale),
  pipeline dei giocatori, gare da vedere. Per scout, direttori e admin.

Stack: **Next.js 16 + Supabase + Tailwind CSS**, pubblicata su **Vercel**: **https://academy-casatese.vercel.app**
Il Portale squadre è JavaScript senza build dentro `public/portale/`.

---

## Accesso: una pagina, un PIN

Tutti entrano da `/` digitando **solo il PIN**. Il PIN dice chi sei:

| PIN | Dove si entra |
|---|---|
| PIN **del mister** (4 cifre, generato dall'admin in Portale → Società → Squadre) | Portale squadre, solo la sua squadra |
| PIN **personale** di uno scout (6 cifre, generato in Società) | Scouting |
| PIN **personale** di un direttore (6 cifre) | Portale: vede tutte le squadre, Società e lo Scouting (area nella barra), **non modifica niente** |
| PIN **admin** (variabile `PIN_ADMIN`) | poi email e password → Portale (lo Scouting è un'area nella barra) |

Niente accesso automatico: il PIN si rimette quando si chiude il browser (per i mister anche
chiudendo la scheda) e comunque dopo **6 ore** (`ORE_ACCESSO`).

## Cosa c'è

### Portale squadre
| Area | Schede |
|---|---|
| Home | prossima partita, allenamento di oggi, cose da fare, numeri della stagione |
| Squadra | Rosa (🧤 portieri), Calendario (campionato + amichevoli) |
| Gara | Partita, Convocazioni, Formazione, Piazzati, Foglio gara PDF |
| Allenamento | Presenze, Test atletici |
| Statistiche | Allenamento (presenze, per mese, test), Partite (minuti, gol, gol subiti); report PDF solo admin |
| Scouting (solo mister) | Segnala un giocatore allo scouting del club (non vede l'archivio) |
| Società (admin; i direttori la vedono) | Squadre con i loro mister, Scouting e Direttori: ognuno col suo PIN personale; backup |

La scheda aperta resta nell'indirizzo (`/portale/#/formazione`): il tasto indietro funziona.

### Scouting Hub
- **Segnala**: segnalazione rapida da telefono; il nome è facoltativo ("N.8, biondo").
- **Giocatori**: archivio con ricerca e filtri; scheda con storia, medie delle 4 aree, stato,
  contatti famiglia protetti.
- **Valutazione**: report a 4 aree con voto 1–5, note e giudizio finale.
- **Pipeline**: Segnalato → Da rivedere → Contattato → Invitato → In prova → Inserito, oppure Chiuso;
  anche come vista a colonne per stato (Giocatori → Per stato).
- **Squadra e prossime gare** nella scheda del giocatore: società + categoria (dall'annata, correggibile), e le
  partite della sua squadra caricate in Gare, con ora, campo e mappa.
- **Eventi** nella scheda del giocatore: open day, provini, allenamenti di prova, con presenza ed esito.
- **Doppioni** (admin): schede dello stesso giocatore scritte in modi diversi, da unire in una.
- **Gare da vedere**: gare dei prossimi 7 giorni vicino a Casatenovo/Merate, "Ci vado io"; sotto ogni partita
  i giocatori segnalati che giocano in quelle squadre.

## Cosa ti serve
- Mac con **Node.js 20.9 o più recente** (`node -v`)
- **VSCode**
- Il progetto **Supabase** del club (uno solo per tutta l'app)

## Avvio sul Mac

```bash
npm install
```

Crea `.env.local` copiando `.env.local.example` e compila:

```
NEXT_PUBLIC_SUPABASE_URL=...        # Supabase → Project Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...       # segreta: solo per gli script, mai nel codice né su GitHub
PIN_ADMIN=...                       # PIN amministratore della pagina d'ingresso
```

```bash
npm run dev
```

Apri http://localhost:3000 e digita il PIN.

## Database (Supabase → SQL Editor)
Da eseguire **una volta**, in ordine (incolla tutto il file → **Run**):
1. `supabase/sicurezza.sql` — protegge i documenti del Portale (admin via login, mister via PIN)
2. `supabase/migrations/0001_…` → `0015_…` — tabelle e permessi di Scouting Hub, accesso col PIN,
   segnalazioni e PIN personali dei mister, permessi dei direttori

Ogni nuova modifica al database = un nuovo file numerato in `supabase/migrations/`.

## Account
- **Admin**: Authentication → Users → Add user (spunta Auto Confirm), poi
  `update public.profiles set ruolo = 'admin' where email = 'tua@email.it';`
- **Scout e direttori**: dal Portale → Società, schede "Scouting" e "Direttori" (aggiungi, genera o
  rigenera il PIN, sospendi). In alternativa, per tanti insieme: elenco in un file JSON (`[{ nome, cognome, email, ruolo }]`, l'email
  può essere segnaposto), poi `node --env-file=.env.local scripts/crea-pin.mjs file.json`.
  Lo script stampa i PIN: consegnali di persona. L'admin li rivede in Portale → Società.
- **Mister**: nessun account. L'admin li aggiunge sotto la loro squadra (Portale → Società → Squadre)
  e genera il PIN personale di ciascuno.

## Distinte di gara (storico giocatori)
Le distinte, anche di stagioni passate, costruiscono lo storico: squadre per stagione, partite, numeri di maglia.
1. Ogni distinta diventa un file JSON in `scripts/import-distinte/dati/` (formato in cima allo script; cartella
   esclusa da git perché contiene dati di minori: solo cognome, nome, data di nascita, numero, società di appartenenza).
2. Simulazione: `node --env-file=.env.local scripts/import-distinte/importa.mjs` → riepilogo (nuovi, già presenti,
   cambi di società, nomi da controllare).
3. Importazione: stesso comando con `--conferma`.
I ragazzi mai osservati restano "da distinta" (nascosti nell'archivio, filtro "Anche solo da distinta") e diventano
osservati alla prima segnalazione.

## Manuali
Quattro manuali in PDF (generale, mister, scout, direttori) in `public/manuali/`, scaricabili dalla pagina del PIN
("Istruzioni"). Sorgenti in `scripts/manuali/` (testo in `genera.py`, schermate con dati inventati in `img/`).
Dopo una modifica: `npm run manuali` (serve Python 3 e Google Chrome sul Mac).

## Backup
`npm run backup` esporta tutto il database in `private/backup/AAAA-MM-GG_HHMM/` (una cartella per tabella in JSON;
esclusa da git). Tiene gli ultimi 12. Il Mac lo lancia da solo **ogni lunedì alle 9** (o al primo risveglio dopo):
attività `~/Library/LaunchAgents/it.academycasatese.backup.plist`, registro in `private/backup/backup.log`.
Per fermarla: `launchctl bootout gui/$(id -u) ~/Library/LaunchAgents/it.academycasatese.backup.plist`.
Le password non si esportano (gli account si ricreano; i dati restano). Per un backup anche fuori dal Mac:
copia ogni tanto `private/backup/` su un disco o un cloud privato, oppure passa al piano Pro di Supabase.

## Pubblicazione su Vercel
1. vercel.com → **Add New… → Project** → importa il repository GitHub `foglio-gara-casatese`.
2. **Environment Variables**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `PIN_ADMIN` (lo stesso di `.env.local`: è l'unico PIN admin, mai scriverlo nel codice),
   `SUPABASE_SERVICE_ROLE_KEY` (serve al pannello Società per creare scout e dirigenti e generare i loro codici;
   resta sul server, non va mai nel browser).
3. **Deploy**, oppure dal terminale del progetto `vercel --prod`. `vercel.json` dice a Vercel che è un'app
   Next.js (senza, pubblicherebbe solo i file di `public/`). Per ripubblicare da solo a ogni `git push`:
   vercel.com → progetto → Settings → Git → collega il repository (serve dare a Vercel l'accesso a GitHub).

## Comandi utili

| Comando | A cosa serve |
| --- | --- |
| `npm run dev` | Avvia l'app sul Mac |
| `npm run typecheck` | Controlla errori nel codice |
| `npm run lint` | Controlla lo stile del codice |
| `npm run build` | Prova la versione di produzione |
| `npm run crea-utenti` | Crea account con password da `scripts/utenti.json` |
| `npm run manuali` | Rigenera i manuali PDF in `public/manuali/` |
| `npm run backup` | Esporta tutto il database in `private/backup/` |
| `npm run deck` | Rigenera il PDF di presentazione (Python: `pip install reportlab pillow`) |

## Struttura delle cartelle

```
app/
  page.tsx, AccessoForm.tsx   pagina d'ingresso (PIN) e scelta pannello per l'admin
  (app)/                      Scouting Hub, pagine protette: home, segnala, giocatori, gare, profilo
  auth/actions.ts             accesso col PIN, uscita, cambio password
public/portale/               Portale squadre (index.html, css/, js/, loghi): script senza build
components/                   pezzi di interfaccia di Scouting Hub
lib/
  supabase/                   collegamento al database, sessione, durata dell'accesso
  ruoli.ts, tipi.ts, utili.ts ruoli e pannelli, stati, date, distanze
supabase/
  sicurezza.sql               permessi dei documenti del Portale
  migrations/                 modifiche al database di Scouting Hub, in ordine
scripts/                      script da lanciare dal Mac (utenti, PIN, import, presentazione)
data/                         dati di prova del Portale (niente dati reali)
docs/                         ROADMAP e presentazione
proxy.ts                      protegge le pagine e porta /portale a /portale/
```

## Modifiche al Portale squadre
I file in `public/portale/js/` sono script normali che condividono le variabili globali: vanno
caricati nell'ordine di `index.html`. Dopo una modifica a un file CSS/JS aumenta il `?v=` nel
tag corrispondente di `public/portale/index.html`, così i telefoni scaricano la versione nuova.
Colori e caratteri sono gli stessi di Scouting Hub (`app/globals.css`).

## Privacy
Il repository è **pubblico**. I dati personali dei ragazzi e delle famiglie non vanno mai su git:
stanno nel database, oppure in `private/` e `scripts/import-sheet/dati/` (esclusi da git).
