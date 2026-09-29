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
- Barra delle aree sempre in alto nell'intestazione (anche da telefono), sotto le schede dell'area. Aree (`AREAS` in
  `portale.js`): Home (weekend, da fare, riepilogo) · Calendario (La mia squadra `calendario`, Tutte le squadre `calendariotutte`) ·
  Modulistica (distinta, programma, comunicazione) · Squadra con tre sottopannelli (`GRUPPI_SQUADRA`, schede sulla seconda riga `#subtabs`): Rosa · Allenamento (Presenze, Test solo
  Under 15 `SOLO_U15`, Statistiche `statallen`) · Partite (Dati partita, Convocazioni, Formazione, Piazzati, Foglio gara, Tabellini, Statistiche
  `statpartite`, Campi) · Scouting (mister: Segnala, Giocatori) · Società (admin).
  Attività di base: niente Dati partita/Formazione/Piazzati/Foglio gara/Campi/Statistiche partite (`SOLO_AGONISTICA`):
  Tabellini con la sola presenza (`x.pres`, `viewGamesAdb`/`gameEditorAdb` in `registro.js`) e le statistiche in cima;
  convocazioni con le partite del weekend proposte (`data-adbsug`, `data-adbweekend`).
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
- **Niente WhatsApp** (né link wa.me né "manda su WhatsApp"): comunicazioni, avvisi, convocazioni e PIN passano solo dall'app
  (i PIN delle famiglie si consegnano col foglio PIN in PDF).
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
`scout` = ex "osservatore" (segnala e valuta). `segreteria` (0030): solo Portale → Segreteria. Rinominati in 0004; se aggiungi
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
  Calendari Google della società (MERATE e CERNUSCO = in casa, TRASFERTA): Claude li scarica col connettore Google Calendar in
  `private/google-calendar/*.json`, poi `google.mjs [--conferma]` mette amichevoli, tornei e attività di base nel `calendar/<squadra>`
  del Portale (squadra dall'annata del titolo "AdB - 2014 - …", `friendly`, `tipo`, `note` senza contatti, `gcal` = id evento;
  il campionato resta quello ufficiale). Nessun aggiornamento automatico: quando l'utente chiede "aggiorna il calendario",
  Claude riscarica i tre calendari (list_events da oggi al 30/06 della stagione, tutte le pagine) nei file di
  `private/google-calendar/`, fa la simulazione e poi `--conferma`.
  La Home del Portale mostra gli impegni della squadra nel weekend della settimana in corso; Calendario → La mia squadra è un solo elenco
  (campionato, amichevoli, tornei con etichetta `tipochip`; "Modifica" dalla riga: ufficiali solo admin, amichevoli anche il
  mister) con le partite da
  giocare, "Solo Uxx" o "Tutte le squadre"; quelle giocate solo nello Storico della propria squadra (`viewStorico()`).
  "Tutte le squadre" ha la vista Giorno (`vistaGiorno()`, colonne Merate/Cernusco/Trasferta come Google Calendar, durata
  indicativa dall'età) o Elenco. Gara → Partita elenca le partite della squadra nel weekend, ognuna con "Usa questa" (`data-usacal`).
  Regola delle date nel Portale: SEMPRE il calendario ufficiale, salvo le variazioni dei comunicati (già nelle gare):
  `portale.mjs [--squadra=<id>]` sovrascrive date e ore scritte a mano; Google non cambia mai le gare di campionato.
  Colori dei tre calendari (`calDi()` in `portale.js`): Merate blu, Cernusco oro, Trasferta rosso.
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
- Portale, attività di base (da Under 13 in giù, `isAdb()` in `registro.js`): squadre t_u13…t_u8 create con
  `scripts/import-adb/importa.mjs` dai fogli presenze (CSV in `private/adb/`, NON su git); niente Formazione/Piazzati/Foglio gara
  (`SOLO_AGONISTICA` in `portale.js`, anche Dati partita); convocazioni da 1 a 4 partite con i loro convocati (`sheet.adb.partite`, `viewConvocazioniAdb()`), PDF orizzontale sul
  modello della società, una colonna per partita (`convocazioneAdbSheet()` in `pdf.js`). Risultato a tempi (3–5) nel tabellino: `g.tempi = [{noi, loro}]`, `g.nTempi`, `riquadroTempi()`/`tempiAdb()` in `registro.js`
- Portale, piazzati (`public/portale/js/piazzati.js`): modelli della società (`shared/schemes`, li modifica l'admin) e "I miei schemi"
  della squadra in `registro/<squadra>.schemi` (li salva il mister col PIN; `preferito`, `da` = modello, `aggiornato`). "Usa come
  modello" (`usaModello`) copia posizioni, compiti e frecce e sceglie la copia per la partita. Editor unico (`boardMode = 'unico'`,
  `viewSchemaEditor`), impaginato come il foglio gara: campo a sinistra, riquadro Compiti a destra (`pannelloCompiti`: nome dei
  compiti, + pedina per compito, giocatore per riga, riga della pedina scelta con numero/compito/etichetta, `data-edtokid`); la pagina dello schema
  è il foglio del PDF (`foglioSchema(sc, rm, livello)`, classi `.foglio`/`.fg*`: intestazione con la partita, campo, indicazioni, Compiti,
  piè di pagina); sui modelli della società il mister scrive indicazioni (`schemeEdits[id].note`, `effNote()` usata anche da `schemePage`)
  e nomi dei compiti (`schemeEdits[id].roles`) solo per la partita; `schemaDa(id)` trova lo schema ovunque (formazione,
  foglio gara), `modificaBase(sc)`/`salvaSchema(sc)` dicono chi lo cambia e dove si salva. I mister non modificano più i modelli
  per la partita (resta solo la lettura delle vecchie `schemeEdits`)
- Portale, calci piazzati (`shared/schemes`, comuni a tutte le squadre): schemi aggiunti in blocco da `scripts/piazzati/schemi.mjs`
  con `scripts/piazzati/aggiungi.mjs [--conferma] [--aggiorna]` (confronto per id; coordinate in metri, bandierina a destra x = 34;
  frecce piene = palla, tratteggiate = movimento). Filtro Tutti/A favore/A sfavore/Scelti (`filtroSchemi` in `schede.js`); in Assegna il
  nome del compito si rinomina per tutte le sue pedine (`data-arolegrp`: admin nello schema, mister solo nella partita, `schemeEdits`)
- Portale, ruolo dei giocatori: lo sceglie anche il mister, in `registro.ruoli` (`ruoloSel()` in `registro.js`); da Under 13 in su
  ruoli completi, sotto portiere/movimento; "portiere" tiene allineato `registro.gk` (gol subiti)
- 0030: ruolo `segreteria` (account personale col PIN, creato in Società → Segreteria via `/api/staff`); entra solo nel Portale,
  area Segreteria (`isSegreteria()` in `core.js`), non nello Scouting
- Intestazione unica dei documenti (fondo bianco: FIGC-SGS, ACADEMY / CASATESE MERATE / categoria, stemma): `intestazioneSocieta()` e
  `immagineIntestazione()` in `pdf.js`, usate da convocazioni (anche attività di base), report statistiche (`reportHeader` in
  `registro.js`), `intestazionePdf(doc, titolo, destra, categoria)` in `modulistica.js` (distinta, programma, comunicazione; pagine
  seguenti bianche con filo blu), fogli PIN (`segreteria.js`, in piccolo). Il foglio gara tiene la sua impaginazione ma su fondo
  bianco (niente fascia blu, riquadri bianchi con bordo, solo la sottile striscia blu-oro-rosso)
- 0047: `coach_segnala` cerca prima se il giocatore è già in lista (qualsiasi annata) e risponde "esistente"; "cosa hai visto" e
  "portiere o movimento" obbligatori solo per un giocatore nuovo (anche in `segnala/actions.ts`). Il Portale controlla da sé solo
  annata e nome
- 0046: ruolo in due passi. `ruolo_campo` + 'movimento' (linea non indicata). Segnalazione: portiere o movimento obbligatorio, poi la linea
  facoltativa (`TIPI_GIOCATORE`, `LINEE` in `lib/tipi.ts`; prima = difensore, seconda = centrocampista, terza = attaccante). Valutazione:
  `ruolo_preciso` da elenco a discesa (`RUOLI_PRECISI`, SQL `ruoli_precisi()`), in `valutazioni` e, col trigger `ruolo_da_valutazione`,
  in `giocatori.ruolo_preciso` + linea in `giocatori.ruolo`. Mostrato con `etichettaRuolo()`. Necessità: "movimento" = da verificare
  (mai per le richieste di portieri). `coach_segnala` e `coach_valuta` riscritte
- 0045: valutazione in 5 aree (`GRUPPI_VALUTAZIONE`: Tecnica, Tattica, Fisico, Mentale, Extra; "Spunti, estro e coraggio" in Mentale),
  nuovi voti `dribbling`, `accelerazione`, `agilita`, `motivazione`, `famiglia`, `potenziale`, `livello_attuale`. `coach_valuta` accetta da
  sola ogni colonna smallint di `valutazioni`: per una voce nuova bastano colonna + riga in `DETTAGLI_VALUTAZIONE` e `DETTAGLI_VALUTA`.
  Modulo: Dove e quando · le 5 aree · Giudizio in fondo con "Il tuo giudizio" (`commento`). Elenco Giocatori: Ruolo, Piede (`piedeDi`),
  Segnalazione (impressione + voto globale = media dei voti per area delle sole segnalazioni), Valutazioni (3 caselle + ultimo giudizio);
  da computer annata accanto al nome e "Squadra e gara" su due righe (`COLONNE_TABELLA`)
- 0044: valutazione con 5 voti facoltativi in più (`marcamento`, `smarcamento`, `trasmissione`, `colpo_di_testa`, `concentrazione`);
  `spunti` = "Spunti, estro e coraggio"; `DETTAGLI_VALUTAZIONE` con `gruppo` (`GRUPPI_VALUTAZIONE`: Con la palla, Senza palla, Fisico, Mentale; nel Portale 4° elemento di
  `DETTAGLI_VALUTA`); `coach_valuta` riscritta
- 0043: le 4 aree (Tecnica, Motoria, Tattica, Mentale, voto 1–5 + nota, tutte facoltative) passano dalla valutazione alla
  segnalazione (`segnalazioni.tecnica…mentale_note`); in `valutazioni` restano per le vecchie righe (ora nullabili). Medie per area
  da segnalazioni e valutazioni insieme (`medieAree`, `mediaVoti`, `conVoti` in `lib/valutazioni.ts`); `coach_segnala`, `coach_valuta`,
  `coach_giocatori` riscritte. Portale: blocco "Voti per area" in `viewSegnala`, niente aree in `viewValutaMister`
  Moduli di segnalazione e valutazione a blocchi numerati (Chi è · Prima impressione · Cosa hai visto · Voti · Dove e quando;
  valutazione: Giudizio · Nel dettaglio · Dove e quando) con pulsante di salvataggio fisso in fondo: `components/Sezione.tsx`
  (`Sezione`, `RigaVoto` con nota apribile, `BarraSalva`) e `components/SceltaRapida.tsx` (si tocca di nuovo per togliere, campo nascosto);
  nel Portale `sezioneForm`, `rigaVoto`, `sceltaRapida` in `portale.js`
- 0042: `segnalazioni.impressione` (positiva / da_rivedere / negativa, `IMPRESSIONI` in `lib/tipi.ts`) al posto del voto 1–5 della
  prima impressione (vecchi voti convertiti: 4–5 positiva, 3 da rivedere, 1–2 negativa); `coach_segnala` riscritta. Nella segnalazione
  tutte le domande facoltative nello stesso stile (oggi `SceltaRapida`): piede preferito (`SCELTE_PIEDE`, al posto di piede
  forte/debole, che restano nel database), prima impressione, statura, forza. Elenco Giocatori: colonna e filtro "Impressione"
  (`impressioneDi()` = ultima segnalazione che ne ha una)
- 0041: segnalazione con `piede` e 4 voti facoltativi 1–5 (`piede_forte`, `piede_debole`, `statura`, `forza`); valutazione con 7 voti
  tecnici facoltativi (`spunti`, `guida_palla`, `ricezione`, `calciata`, `contrasto`, `velocita`, `reattivita`) oltre alle 4 aree.
  Elenchi in `lib/tipi.ts` (`DETTAGLI_SEGNALAZIONE`, `DETTAGLI_VALUTAZIONE`), `SceltaRapida`; nel Portale
  `DETTAGLI_SEGNALA`/`DETTAGLI_VALUTA`; `coach_segnala`/`coach_valuta` riscritte. Giocatori già nelle nostre rose:
  `scripts/inserisci-da-rose.mjs [--conferma]` (abbina per nome e annata ±1, li mette "Inseriti" e dell'Academy, nota nello storico e
  nella carriera; elenco con i nomi in `private/inseriti-da-rose.json`)
- 0040: tre valutazioni per inserire: `valutatori_distinti(giocatore)` conta le persone diverse (account o mister), il trigger
  `controlla_inserimento` blocca il passaggio a `inserito` sotto 3. Nell'app: 3 caselle con le iniziali (`SlotValutazioni`,
  `valutatori()` in `components/Autore.tsx`, `slotValutazioni()` nel Portale), verdi a 3 su 3 (riga/scheda verde). Annate con un
  colore ciascuna (`components/Annata.tsx`); elenco Giocatori di base raggruppato per annata (dalla più giovane)
- 0039: `archivio_documenti` (PDF in bytea, max 15 MB): ogni PDF scaricato dal Portale passa da `consegnaPdf(nome, blob, tipo)` in
  `pdf.js` (scarica + `archivia_documento(pin, nome, tipo, squadra, base64)`, col PIN per mister/organizzativo, account per lo staff).
  Li vedono e scaricano admin e direttori (`archivio_scarica(id)`), li elimina l'admin: Società → Archivio documenti (`archivio.js`).
  Esclusi i fogli PIN delle famiglie (credenziali) e il backup JSON. Valutazioni nominali: iniziali colorate `components/Autore.tsx`
  (`firma()`, `Autori`) nell'elenco Giocatori, nelle Necessità e nella scheda (medie e storico, con "Elimina" per admin, direttori e
  autore); nel Portale `autoreTondo()`
- 0038: `calendari_squadre()` (admin, direttori, scout): squadre del Portale (senza organizzazione e preparatori) con le sole
  partite (data, ora, avversario, casa, campo, tipo). Pagina Scouting `/calendario`: tutte le annate, colori come `calDi()` del Portale,
  periodo (weekend, 2 settimane, stagione) e squadra
- 0037: `con_contatto(ids)`: quali giocatori (visibili a chi chiama) hanno un contatto con telefono o email, solo sì/no, anche per
  gli scout; `conContatto()` in `lib/contatti.ts`, segno verde `components/ContattoFlag.tsx` (elenco Giocatori, scheda, Necessità)
- 0036: `necessita` (titolo, `annata_da`–`annata_a`, `ruolo`, `piede`, `priorita` alta/media/bassa, `note`, `aperta`): le leggono
  admin, direttori e scout (`puo_segnalare()`), le scrivono admin e direttori (`vede_tutto()`). Pagina `/necessita` (scheda
  "Necessità"): sotto ogni richiesta i giocatori osservati che rientrano (esclusi Academy, `inserito`, `da_non_inserire`), prima i
  "Da prendere" poi per media; "Da verificare" = ruolo o piede non indicato
- 0035: `carriera` (società stagione per stagione: `societa_nome` di allora, `stagione` "2025/26", `origine` iniziale/cambio/manuale,
  `nota`); trigger `registra_carriera` a ogni cambio di `societa_id` (e alla creazione se osservato; un secondo cambio nello stesso giorno
  corregge il primo), `controlla_cambio_societa` (solo admin, direttori, scout), `cambia_societa(giocatore, societa, dal, nota)` per gli
  scout anche sui giocatori degli altri, `stagione_di(date)`. `unisci_societa`/`unisci_giocatori` riscritte: spostano la carriera e non
  la contano come cambio (`app.unione`). Scheda: `components/CarrieraGiocatore.tsx` (con le stagioni delle distinte); la società non si
  cambia più da "Modifica dati"
- 0034: i direttori scrivono `calendar/*`, `shared/eventi`, `shared/avvisi` (come l'organizzativo; `puoOrganizzare()` = admin,
  direttori, organizzativo). Modulistica in `public/portale/js/modulistica.js`, area **Modulistica** del Portale: Distinta (`sheet.distinta`),
  Programma gare dal–al (PDF in ordine di categoria, dalla più grande, poi giorno e ora: `ordineProgramma`), Comunicazione (`viewComunicazione`, modelli degli avvisi; PDF con la stessa intestazione della convocazione,
  `intestazioneSocieta`/`immagineIntestazione` in `pdf.js`; spunta "Mostra la categoria": mister = la sua, staff la sceglie; anche Avvisi → Scarica PDF). Impaginazione automatica
  in testa a `modulistica.js` (`riga1` una riga che rimpicciolisce e poi taglia con "…", `blocco`/`misuraBlocco` su più righe,
  `paragrafi` con elenchi rientrati e righe giustificate, `nuovaPagina` con fascia "segue"): la comunicazione sceglie la grandezza
  più grande che sta in una pagina (12,5→9, poi 11 su più pagine), la distinta stringe le righe per stare in una pagina e tiene
  insieme staff, note e firme, il programma non lascia un giorno da solo in fondo alla pagina. Foglio gara (`pdf.js`, canvas):
  `righeTesto`, `testoInRiquadro` (scende di grandezza e poi "…"), `taglia`; nella pagina dello schema il campo si rimpicciolisce
  per lasciare spazio alla nota (fino a 3 righe) e la legenda va in fondo al riquadro dei compiti; in copertina l'elenco dei
  piazzati ha una sola grandezza (righe lunghe con "…", oltre lo spazio "e altri N schemi") e le note stanno nel loro riquadro; casella
  "Mostra la categoria" (`sheet.senzaCategoria`) per le intestazioni di convocazioni, distinta e foglio gara
- 0033: `documenti_tesserati` (visita medica, bonifico con `rata` = posizione in quote, altro; file in `bytea`, max 4 MB,
  foto ridotte a 1600 px nel browser): la famiglia carica con `famiglia_carica(pin, …)` e li vede in `famiglia_get`; la
  segreteria li apre con `documento_scarica(id)`, li accetta (bonifico → rata pagata, visita → nuova scadenza) o rifiuta con nota
- 0032: segnalare un giocatore già in lista (osservato) apre la valutazione, per tutti: nello Scouting `segnala/actions.ts`
  rimanda a `/giocatori/<id>/valuta?gia=1&nota=…`; nel Portale `coach_segnala` (ora jsonb) risponde `esistente` e il mister
  valuta con `coach_valuta` (firma in `valutazioni.autore_squadra`). Portale: Squadra → Allenamento → "I miei allenamenti 🚧"
  (lavori in corso)
- 0031: famiglie e segreteria. Tabelle protette `tesserati` (squadra_id + giocatore_id della rosa, `pin` famiglia a 8 cifre),
  `tesserati_dati` (genitori, certificato, taglie, iscrizione, quote, note_segreteria), `risposte_convocazioni`: RLS
  `gestisce_segreteria()` (admin, direttori, segreteria). `segreteria_rose()` = squadre e rose senza PIN dei mister;
  `genera_pin_famiglia()`. La famiglia entra col PIN (`tipo_pin()` in `accedi`, un solo errore annotato: con tanti accessi il
  blocco 0015 non deve scattare) → `/portale/#famiglia=PIN` → `famiglia.js`: `famiglia_get` (solo il suo ragazzo, le sue
  convocazioni, avvisi ed eventi della squadra), `famiglia_contatti` (genitori e taglie), `famiglia_rispondi` (ci sarà / non ci
  sarà, chiave = calId o "data|avversario"). Il mister vede le risposte in Convocazioni (`coach_risposte`, `rispostaFamiglia()`).
  Segreteria: `segreteria.js` (area Segreteria → Tesserati), PIN alla famiglia col foglio PIN in PDF (`fogliPin()`, 8 per pagina).
  Anagrafica iniziale da importare dal file della segreteria (in `private/`, mai su git)
- 0029: squadra con `organizza: true` (responsabile organizzativo, casella in Società → Nome e categoria): `coach_get` gli dà
  tutte le squadre senza PIN e `calendar/*`; `coach_set` scrive `calendar/*`, `shared/eventi`, `shared/avvisi`. Tutti i mister
  leggono `shared/eventi` e `shared/avvisi`. Nel Portale `public/portale/js/organizzazione.js`: niente area Eventi (gli eventi si creano e
  modificano in Calendario → Tutte le squadre, `formEvento()`, "+ Nuovo evento"), Calendario → Avvisi (admin e organizzativo),
  Home dell'organizzativo, amichevoli e tornei di ogni squadra modificabili in Tutte le squadre (il campionato no), eventi nei
  calendari (`eventoCome`, colonna del luogo), avvisi per 14 giorni nella Home dei mister (e delle famiglie)
- 0028: squadra con `vedeTutte: true` in `shared/teams` (preparatori dei portieri, `t_nt2m1iv`): `coach_get` le dà tutte le
  squadre senza PIN e rosa/foglio/calendario/registro di tutte; nel Portale `squadraPropria` + `guardaAltra()` = sola lettura
  sulle altre (`save()` non scrive), la propria (presenze) la modificano. `coach_giocatori(pin)`: Scouting → Giocatori, osservati
  dell'annata della squadra (esclusa l'Academy; per la squadra vedeTutte i portieri di tutte le annate) con segnalazioni e
  valutazioni, mai contatti né note del giocatore.
  Presenze dei preparatori: `scripts/import-adb/importa.mjs --squadra=SGS` da `private/adb/SGS.csv`.
  Ogni preparatore ha `coaches[].eta` (Società → "Portieri di: Under"): Home e Calendario → "I miei portieri" mostrano solo le
  partite di quelle categorie (`impegni()`, `etaPortieri()` in `portale.js`, preparatore riconosciuto da `misterName`),
  con sotto ogni partita i portieri della squadra (`registro.gk`) e lo stato della convocazione (`chipsPortieri()`: sheet.callup
  o sheet.adb.partite[].conv), filtro per portiere. Portieri della rosa dei preparatori segnati nelle rose delle squadre con
  `scripts/import-adb/portieri.mjs [--conferma]` (confronto per nome, stampa solo conteggi)
- 0027: `coach_calendari(pin)`: i mister leggono nome, categoria e partite di tutte le squadre (Calendario "Tutte le squadre",
  in Squadra → Calendario); admin e direttori leggono i `calendar/<squadra>` direttamente
- 0026: pagina della partita `/gare/[id]` (dati, chi ci va, giocatori visti con `segnalazioni.gara_id`, distinte): la modificano
  chi l'ha inserita (solo gare a mano) e admin/direttori; una gara dei calendari modificata a mano diventa "variata"
  ("Modificata a mano"), così `importa.mjs` non la sovrascrive. Partite cliccabili in Home, Gare e Attività
- 0025: incarichi affidati: `gara_id`, `giocatore_id`, `affidato_da`, tipo `giocatore`. "Affida a" (lista `staffScouting()`
  in `lib/staff.ts`) in Home, nella scheda del giocatore (`affidaGiocatore`) e sotto ogni gara (`affidaGara`, segna anche "Ci va")
- 0024: `incarichi` in Home (`components/Incarichi.tsx`): li creano/eliminano admin e direttori (vede_tutto), li prendono
  direttori e scout con `prendi_incarico()`, `lascia_incarico()`, `chiudi_incarico(id, esito)`. Tolti dall'app e dai manuali
  gli avvisi sul consenso dei contatti (staff tutto tesserato: si condividono all'interno dello staff)
- 0023: "Aggiungi partita" (`/gare/nuova`): gare a mano anche dagli scout (`chiave` null, `inserita_da`),
  `segnalazioni.gara_id`, `gare_allegati` + contenitore privato `distinte` (foto/PDF, vedono vede_tutto() e chi carica;
  il browser carica i file dopo `salvaPartita()`). Distanze nel pannello Gare da `CENTRO_DISTANZE` (lib/gare.ts, tra Merate e
  Cernusco L.) con tolleranza 10%; `sedi` non si usa più. Il backup scarica anche i file delle distinte
- 0022: stati `in_lista`, `in_osservazione`, `da_rivedere`, `inserito`, `da_non_inserire` (rinominati da segnalato,
  contattato, chiuso; invitato/in_prova → in_osservazione e vietati, restano nel tipo solo per lo storico: `etichettaStato()`).
  I giocatori dell'Academy (`idNostraSocieta()` in `lib/societa.ts`) non compaiono in elenco e vista per stato se non con "Tutti i giocatori"
- 0021: `nome_proprio()` + trigger `giocatori_nomi`: cognome e nome dei giocatori sempre "Rossi", "Maria Elena",
  "D'Angelo" (anche da importazioni e Portale); stessa regola di `maiuscoleIniziali()` in `lib/utili.ts`

Calendari Google (MERATE, CERNUSCO, TRASFERTA) ↔ Portale: `app/api/calendario-google/route.ts` (admin e direttori con la sessione,
organizzativo col PIN; legge e scrive `calendar/<squadra>` e `shared/eventi` con i permessi di chi chiama), regole in
`lib/calendario-google.ts`, chiamate a Google in `lib/google-calendar.ts` (account di servizio: `GOOGLE_SERVICE_ACCOUNT` = file JSON intero,
`GCAL_ID_MERATE/CERNUSCO/TRASFERTA`; solo variabili d'ambiente, mai nel codice). Nel Portale "↻ Aggiorna da Google" (Tutte le squadre)
e invio automatico di amichevoli, tornei ed eventi modificati (`partitaSuGoogle`, `eventoSuGoogle` in `organizzazione.js`).
Il percorso è escluso dal controllo login di `lib/supabase/sessione.ts` (controlla da solo chi chiama).

Coordinate dei campi (distanze nel pannello Gare): `scripts/geocodifica-campi.mjs [--tutte] [--conferma]` le ricava da
OpenStreetMap (`scripts/lib/luoghi.mjs`: Nominatim, 1 richiesta al secondo, posizione accettata solo se nel comune giusto)
dall'indirizzo del campo o dal centro del paese. `portale.mjs` fa lo stesso per le gare dell'Academy (`gare.lat/lon`).
Calendario del Portale: ogni partita collegata ha `venue` (campo scritto come nel calendario/comunicato), `address`, `ll`
("lat,lon"); le convocazioni li leggono dal calendario (`luogoPartita()` in `schede.js`), il ritrovo (`meetAddress`) solo se altrove.

## Convenzioni del codice
- Form = Server Action che, a fine lavoro, fa `redirect` con `?ok=` o `?errore=` (mostrati da `<Avviso>`).
- Società sempre tramite `trovaOCreaSocieta()` (lib/societa.ts), mai insert diretti: evita i doppioni.
- Date e ore sempre in fuso `Europe/Rome` (`istanteItaliano`, `dataOraBreve` in lib/utili.ts);
  per "adesso" nei componenti server usa `istanteTraOre()` (la regola di lint vieta `Date.now()` nel render).
- Tipi SQL ↔ TypeScript allineati in `lib/tipi.ts`: se aggiungi uno stato, aggiornalo in entrambi.

## Prove rapide
`npm run prove` = lint, tipi, regole di calcolo (`npm run prove:regole`: `tests/*.test.mjs` con `node --test`, indirizzi `@/` tradotti da
`tests/registra.mjs`; categorie, testi e date, doppioni, 3 valutazioni in `lib/valutazioni.ts`, calendari Google, impaginazione dei PDF
del Portale caricata in un ambiente finto), `scripts/prove-portale.mjs` (sintassi di ogni file del Portale, file di `index.html` esistenti e con
`?v=`, nessun file dimenticato), build. Le stesse partono da sole su GitHub a ogni salvataggio (`.github/workflows/prove.yml`,
"Prove rapide", senza segreti): se falliscono arriva un'email. Prima di pubblicare su Vercel lanciare `npm run prove`.
Il token di `gh` non ha il permesso `workflow`: i file in `.github/workflows/` si creano dal sito di GitHub.

## Test dei profili
`node --env-file=.env.local scripts/test-profili.mjs private/test-profili.json`: permessi di tutti i profili sul database e
giro completo del sito vero con ogni profilo (identità di prova temporanee, cancellate alla fine). Rifarlo dopo modifiche a
permessi, migrazioni o navigazione del Portale.

## Backup
`npm run backup` (scripts/backup.mjs) → `private/backup/` (`_riepilogo.json` con `problemi`). Attività di macOS (LaunchAgent
`it.academycasatese.backup`, ogni giorno alle 9:00 e all'accensione) → `scripts/avvia-controllo-backup.sh` (trova Node da solo) →
`scripts/controlla-backup.mjs`: se l'ultimo backup riuscito ha 7 giorni o più lo rifà; se fallisce o supera gli 8 giorni apre un
avviso sul Mac (`--prova-avviso` per provarlo). Registro in `private/backup/backup.log`. Se aggiungi una tabella, aggiungila anche all'elenco `TABELLE` dello script.

## Contatti nelle note
`scripts/sposta-contatti-dalle-note.mjs [--conferma]`: telefoni ed email scritti nei testi (note, segnalazioni, valutazioni, eventi,
carriera) → `contatti` (solo admin e direttori), nel testo "(contatto nei Contatti)". Stampa solo conteggi.

## Manuali
PDF in `public/manuali/` (link "Istruzioni" nella pagina del PIN), sorgenti in `scripts/manuali/genera.py`.
Se cambi una funzione, un pulsante o un permesso, aggiorna il testo del manuale e rilancia `npm run manuali`.
Nelle schermate dei manuali solo dati inventati (repository pubblico).

## Stato
Vedi `docs/ROADMAP.md`.
