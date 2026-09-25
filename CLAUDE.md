@AGENTS.md

# Academy Casatese Merate — contesto per Claude

App web unica del settore giovanile di calcio (Brianza), con due pannelli:
- **Portale squadre** (`public/portale/`): rosa, calendario, foglio gara, convocazioni, formazione,
  presenze, statistiche. Per mister (PIN della squadra) e admin.
- **Scouting Hub** (Next.js, `app/`): segnalazioni dal campo, report a 4 aree
  (Tecnica, Motoria, Tattica, Mentale), pipeline dei giocatori. Per scout, direttori, admin.

Repository **pubblico**: niente dati personali dei ragazzi su git (`private/`,
`scripts/import-sheet/dati/` sono esclusi).

## Accesso (pagina `/`, `app/auth/actions.ts` → `accedi`)
Un solo campo PIN per tutti: PIN squadra → `/portale/#squadra=PIN` (mister); PIN personale
(`email_per_pin()`, migrazione 0006; il PIN è la password dell'account) → Scouting Hub;
`PIN_ADMIN` (variabile solo server) → poi email e password → Portale. Admin e direttori già entrati che aprono `/`
tornano dritti al Portale (niente pagina di scelta); il Portale, se non riconosce la sessione, rimanda a `/?pin=1`
(mostra sempre il PIN, evita il giro di rimandi).
Niente accesso automatico: cookie di sessione e massimo `ORE_ACCESSO` ore dal login
(`lib/supabase/durata.ts`, stesso valore in `public/portale/js/core.js`). Uscite sempre
`signOut({ scope: 'local' })`, per non chiudere la sessione sugli altri dispositivi.

## Portale squadre (`public/portale/`)
- JavaScript classico senza build, variabili globali condivise, caricato nell'ordine di
  `index.html`; ESLint lo ignora. Dopo ogni modifica a CSS/JS aumenta il `?v=` in `index.html`.
- Servito su `/portale/` (la barra finale serve ai percorsi relativi: `next.config.ts` + `proxy.ts`),
  fuori dal controllo login del proxy.
- Dati: tabella `docs` a chiave/valore (`shared/teams`, `roster/<squadra>`, …), permessi in
  `supabase/sicurezza.sql`: admin per email, mister solo via funzioni `coach_*` col PIN.
- Squadre: `coaches: [{id, name, code}]` = mister con PIN personale (Società → Squadre, admin e direttori);
  `code` sulla squadra = vecchio PIN condiviso, valido finché l'admin non lo disattiva. `coach` = testo riassuntivo.
  `coach_team()` non restituisce mai PIN.
- Società (la modificano admin e direttori, 0020): squadre con i mister, poi "Scouting" (scout) e "Direttori"
  mostrati come squadre, ognuno col suo PIN. Account e PIN di scout/direttori via `POST /api/staff` (admin e direttori)
  (crea, pin, nome, stato): il codice è la password dell'account, salvato anche in `codici_accesso`.
- Barra delle aree sempre in alto nell'intestazione (anche da telefono), sotto le schede dell'area.
- Lo Scouting (pagine Next) è un'area del Portale: stessa intestazione (`app/(app)/layout.tsx`, `components/Aree.tsx`,
  `components/Scheda.tsx`); nel Portale l'area "Scouting" di admin e dirigenti porta a `/home`.
- Direttori nel Portale: vedono tutte le squadre in sola lettura (`readOnly()` in `core.js`, vero tranne nella scheda
  Società `squadre`: `save()` non scrive e ricarica il dato vero, campi `readonly`, pulsanti nascosti con `.ro`); nel database
  `docs` solo in lettura (0011) tranne `shared/teams`, che scrivono (0020).
  La sessione vale per il Portale se è dell'admin (`ADMIN_EMAIL`) o di un direttore (`staffRole`).
- `IN_APP_UNICA` (percorso `/portale/`): legge la sessione dagli stessi cookie di `@supabase/ssr`
  (`cookieStorage` in `core.js`), il PIN del mister sta in `sessionStorage` e non nell'indirizzo,
  senza accesso valido torna a `/`. Fuori da `/portale/` (solo prove in locale: GitHub Pages è spento) usa ancora la sua schermata: PIN squadra
  per i mister, email e password per l'admin. Nessun PIN admin nel codice (repository pubblico).
- Colori e caratteri uguali a `app/globals.css`; il verde resta solo per il campo e "presente".

## Chi sviluppa
L'utente sviluppa da solo con Claude, in VSCode, su Mac. Spiega i passaggi in italiano,
in modo semplice e concreto; indica sempre in quale file va ogni modifica e i comandi da lanciare.

## Stack
- Next.js 16 (App Router, TypeScript). Il middleware si chiama `proxy.ts`.
  Prima di usare API Next.js controlla la documentazione in `node_modules/next/dist/docs/`.
- Supabase: database Postgres, login, storage. Client in `lib/supabase/` (`server.ts` per server, `client.ts` per browser).
- Tailwind CSS v4: colori e font del club definiti in `app/globals.css` (`bg-blu`, `text-oro`, `font-display`…).
- Pubblicazione: Vercel, variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PIN_ADMIN`.
- Server Actions per i form (vedi `app/auth/actions.ts`), `useActionState` nei componenti client.

## Regole
- Permessi SEMPRE nel database con Row Level Security; l'interfaccia li rispecchia soltanto.
  Funzioni SQL disponibili: `mio_ruolo()`, `vede_tutto()`, `is_admin()`.
- Ogni modifica al database = un nuovo file in `supabase/migrations/` con numero progressivo
  (`0002_...sql`); mai modificare una migrazione già eseguita.
- I contatti delle famiglie (quasi tutti minorenni) vanno in una tabella separata leggibile solo
  da admin e responsabile. Nessun dato non tecnico o sensibile nelle note.
- La service role key si usa negli script in `scripts/` e, nell'app, SOLO in `app/api/staff/route.ts`
  (via `lib/supabase/servizio.ts`, dopo aver verificato che chi chiama è admin o direttore). Mai nel browser.
- Testi dell'interfaccia in italiano, frasi brevi, verbi chiari ("Salva report", non "Invia").
- Mobile first: gli osservatori usano l'app dal telefono a bordo campo.

## Ruoli
`admin`, `direttore` (a capo di squadre e scout: vede tutto; **squadre del Portale in sola lettura, Società e Scouting
li modifica come l'admin**, 0018 e 0020),
`scout`, `mister` (tipo `public.ruolo`, tabella `profiles`). In `lib/ruoli.ts`: `vedeTutto()` = leggere tutto
(admin, direttori), `gestisce()` = modificare stati, gare, dati di tutti nello Scouting (admin e direttori, SQL `vede_tutto()`),
`puoSegnalare()` = admin, direttori e scout.
Solo admin/direttore/scout accedono a Scouting Hub (`puoAccedere()` in `lib/ruoli.ts`,
controllato in `app/(app)/layout.tsx`); `pannelloIniziale()` sceglie dove si arriva dopo il PIN.
I mister non hanno account personali: entrano nel Portale col PIN della squadra. `direttore` = ex "responsabile" (vede tutto, gestisce stati e gare),
`scout` = ex "osservatore" (segnala e valuta). Rinominati in 0004; se aggiungi
codice che confronta stringhe di ruolo, usa i nomi nuovi.

## Modello dati (supabase/migrations)
- 0001: `profiles` (ruolo, annate, attivo) + funzioni `mio_ruolo()`, `vede_tutto()`, `is_admin()`, `imposta_ruolo()`
- 0002: `societa` (con `alias`), `giocatori` (cognome O descrizione obbligatori, `stato`),
  `contatti` (protetti), `segnalazioni`, `valutazioni` (4 aree 1–5), `storico_stati` (trigger);
  funzioni `puo_segnalare()`, `puo_vedere_annata()`; solo admin/direttori cambiano `stato` (trigger)
- 0003: `sedi`, `squadre_seguite`, `gare` (casa/trasferta + coordinate), `gare_osservatori`
- 0004: rinomina ruoli `responsabile`→`direttore`, `osservatore`→`scout`; blocco app dei mister
- 0005: `codici_accesso` (PIN degli account personali; dalla 0008 leggibili solo dall'admin)
- 0006: `email_per_pin()` per l'accesso col solo PIN
- 0007: segnalazioni dei mister dal Portale: `coach_segnala()`, `coach_societa()`, `mister_for_pin()`,
  colonne `segnalazioni.squadra` e `giocatori.segnalato_da_squadra` (firma "<mister> · <categoria>")
- 0008: PIN personali dei mister (`team_for_pin`, `coach_team` riscritte); `codici_accesso` leggibile solo dall'admin
- 0009: direttori in sola lettura nello Scouting (superata dalla 0018)
- 0010: direttori leggono e scrivono `docs` (Portale) e vedono `codici_accesso`; tolta `dirigente_get()`
- 0011: direttori solo in lettura su `docs` (Portale)
- 0012: `eventi_giocatore` (open day, provini: presenza, esito) nella scheda del giocatore; `doppioni_esclusi`;
  `unisci_giocatori()` (admin e direttori, 0018) — ricerca dei doppioni in `lib/doppioni.ts`, pagina `/giocatori/doppioni`;
  unione in blocco dagli script: `scripts/unisci-giocatori.mjs private/<file>.json [--conferma]` (tiene la scheda più
  completa, riempie i campi vuoti, unisce i contatti con stesso telefono/email, differenze nelle note);
  vista a colonne per stato `/giocatori/stati`
- 0013: `giocatori.categoria` (solo se diversa da quella dell'annata). Squadra del giocatore = società + categoria;
  regole in `lib/categorie.ts` (età sportiva = anno di fine stagione − annata). La scheda mostra le prossime gare
  della sua squadra, il pannello Gare i giocatori segnalati di ogni partita (`giocatoriDellaGara` in `lib/gare.ts`)
- 0014: distinte e storico. Un solo archivio: `giocatori.osservato` (false = visto solo nelle distinte, nascosto di norma;
  diventa true con la prima segnalazione/valutazione/evento, trigger). `squadre` (società + categoria + stagione "2024/25"),
  `distinte` (una per partita), `distinte_giocatori` (presenza, numero, titolare, capitano, società di appartenenza se
  diversa dalla squadra). Si importano con
  `scripts/import-distinte/importa.mjs` da JSON in `scripts/import-distinte/dati/` (NON versionata: dati di minori;
  solo cognome, nome, data di nascita, numero, società). Nell'archivio, colonne, Home e Gare contano solo gli osservati.
- 0015: blocco PIN a raffica: `pin_errati`, `controlla_blocco_pin()` (30 PIN sbagliati in 10 minuti → errore PT429
  per tutti), `team_for_pin`/`email_per_pin`/`coach_get`/`coach_societa` ora `volatile`
- 0016: calendari nelle gare: `stagione`, `girone`, `giornata`, `turno`, `stato` ('calendario'/'confermata'/'variata'),
  `comunicato` ("C.U. n. 12 del …"), `precedente` (valori prima della variazione), `ora_da_definire`, `codice_campo`,
  `chiave` unica; `gara_unica` ora comprende la categoria. Importazione: `scripts/import-calendari/` (`prepara.py` legge i
  PDF con pdfplumber e abbina i nomi all'elenco campi del girone; `importa.mjs` simula, `--conferma` scrive; reimportando
  non tocca le gare già confermate/variate). Il pannello Gare carica solo le gare delle società che interessano.
  Comunicati settimanali: PDF in `private/comunicati/`, `comunicati.py` legge le tabelle "GARA VARIATA" e le regole
  "per tutto il campionato" (solo dati delle gare, mai nomi di persone) → `applica-comunicati.mjs [--conferma]`, poi
  `portale.mjs`. Confermata = gara tra la data del C.U. e la domenica dopo, non variata dal C.U. del suo ente
  (CRL per regionali/élite, delegazione per i provinciali). Le coppe si ignorano.
- 0017: `unisci_societa()` (sposta giocatori, gare, squadre seguite, squadre e distinte; il nome tolto diventa alias),
  script `scripts/unisci-societa.mjs` con un JSON in `private/`
- 0018: direttori nello Scouting come l'admin: `puo_segnalare()` comprende il direttore, le regole di gestione
  (stati, gare, squadre seguite, sedi, distinte, doppioni, `unisci_giocatori`, `unisci_societa`) usano `vede_tutto()`.
  Portale (`docs`, 0011): direttori solo in lettura (Società e PIN: vedi 0020)
- 0019: niente più stato `chiuso` (vincolo `giocatori_niente_chiuso`): i chiusi tornati `segnalato`, motivo aggiunto
  alle note ("Esito: …"). Il valore resta nel tipo SQL solo per le vecchie righe di `storico_stati`
  (`etichettaStato()` in `lib/tipi.ts`); `motivo_chiusura` e `rivedere_dal` non si usano più
- 0020: direttori scrivono `docs` solo per `shared/teams` (area Società); `/api/staff` accetta admin e direttori
- 0021: `nome_proprio()` + trigger `giocatori_nomi`: cognome e nome dei giocatori sempre "Rossi", "Maria Elena",
  "D'Angelo" (anche da importazioni e Portale); stessa regola di `maiuscoleIniziali()` in `lib/utili.ts`

## Convenzioni del codice
- Form = Server Action che, a fine lavoro, fa `redirect` con `?ok=` o `?errore=` (mostrati da `<Avviso>`).
- Società sempre tramite `trovaOCreaSocieta()` (lib/societa.ts), mai insert diretti: evita i doppioni.
- Date e ore sempre in fuso `Europe/Rome` (`istanteItaliano`, `dataOraBreve` in lib/utili.ts);
  per "adesso" nei componenti server usa `istanteTraOre()` (la regola di lint vieta `Date.now()` nel render).
- Tipi SQL ↔ TypeScript allineati in `lib/tipi.ts`: se aggiungi uno stato, aggiornalo in entrambi.

## Backup
`npm run backup` (scripts/backup.mjs) → `private/backup/`; attività settimanale di macOS (LaunchAgent
`it.academycasatese.backup`, lunedì 9:00). Se aggiungi una tabella, aggiungila anche all'elenco `TABELLE` dello script.

## Manuali
PDF in `public/manuali/` (link "Istruzioni" nella pagina del PIN), sorgenti in `scripts/manuali/genera.py`.
Se cambi una funzione, un pulsante o un permesso, aggiorna il testo del manuale e rilancia `npm run manuali`.
Nelle schermate dei manuali solo dati inventati (repository pubblico).

## Stato
Vedi `docs/ROADMAP.md`.
