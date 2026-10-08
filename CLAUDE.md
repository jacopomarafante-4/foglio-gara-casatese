@AGENTS.md

# Academy Casatese Merate — contesto per Claude

App web unica (Next.js, `app/`) del settore giovanile di calcio (Brianza):
- **Squadre** (aree Home, Calendario, Squadra, Società, Segreteria; gruppo `app/(aree)/`): rosa, presenze, test,
  convocazioni, formazione, piazzati, foglio gara, tabellini, statistiche, campi. Per mister (PIN), admin, direttori, segreteria.
- **Scouting Hub** (gruppo `app/(app)/`): segnalazioni dal campo, valutazioni, pipeline dei giocatori. Per scout, direttori, admin.
- **Famiglie** (`app/famiglia/`): convocazioni con risposta, calendario, anagrafica, documenti per la segreteria (PIN della famiglia).
Il vecchio **Portale squadre** (`public/portale/`, JavaScript senza build) è **spento** dal 30/09/2026: tutte le sue schede sono
pagine dell'app. `next.config.ts` rimanda i vecchi indirizzi (`/portale/`, js, css) a `/inizio`; in `public/portale/` restano solo gli
stemmi (`casatese-logo.png`, `figc-sgs-logo.png`, usati da pagine e PDF). `npm run prove:portale` (`scripts/prove-portale.mjs`)
controlla che resti spento. Nei nomi (dati `docs`, `lib/portale-dati.ts`, `HomePortale`) "Portale" = la parte squadre dell'app.

Repository **pubblico**: niente dati personali dei ragazzi su git (`private/`,
`scripts/import-sheet/dati/` sono esclusi).

## Accesso (pagina `/`, `app/auth/actions.ts` → `accedi`)
Un solo campo PIN per tutti (`tipo_pin()`): PIN di un mister → tessera e `/inizio` (o la pagina da cui arrivava, `?next=`); PIN di
una famiglia → tessera famiglia e `/famiglia`; PIN personale (`email_per_pin()`, 0006; il PIN è la password dell'account) → Home o
Scouting (`pannelloIniziale()`), la segreteria → `/segreteria`; `PIN_ADMIN` (variabile solo server) → poi email e password → `/inizio`.
Admin e direttori già entrati che aprono `/` tornano dritti a `/inizio`; `/?pin=1` mostra sempre il PIN.
Niente accesso automatico: cookie di sessione e massimo `ORE_ACCESSO` ore dal login (`lib/supabase/durata.ts`, anche per le
tessere). Uscite sempre `signOut({ scope: 'local' })`, per non chiudere la sessione sugli altri dispositivi; `esci` e `/esci`
tolgono anche le tessere e i cookie `acm_squadra`/`acm_profilo`.
- **Tessera** (mister e famiglie): cookie `acm_mister` / `acm_famiglia` cifrato (AES-GCM, chiave da `SEGRETO_SESSIONE`, solo variabile
  d'ambiente, anche su Vercel) con PIN e ora dell'accesso, httpOnly, di sessione (`lib/tessera.ts`). Senza `SEGRETO_SESSIONE` mister e
  famiglie non entrano ("Accesso col PIN non disponibile"). Il proxy (`lib/supabase/sessione.ts`) lascia passare chi ha la tessera;
  `getMister()` (`lib/mister.ts`) la verifica con `coach_team`, `getFamiglia()` (`lib/famiglia.ts`) con `famiglia_get`; le pagine
  leggono e scrivono con le funzioni `coach_*` / `famiglia_*` (i permessi restano nel database). Un mister che apre una pagina senza
  accesso passa dal PIN e ci torna (`?next=`).
- **Un PIN per persona** (0050, tranne l'admin): mister di più squadre = stesso `code` su ogni riga (la squadra aperta la dice
  l'intestazione `x-squadra`: cookie `acm_squadra` scelto con `/api/squadra`, `createClient(squadra)` in `lib/supabase/server.ts`;
  `team_for_pin` sceglie solo tra le squadre del PIN; `coach_squadre(pin)` = tutte); staff che è anche mister = il `code` del mister è
  il suo PIN personale: `tipo_pin` prima i PIN personali, all'accesso `sono_anche_mister()` → tessera anche allo staff (`chi.misterDi`
  in `lib/portale-dati.ts`: nelle sue squadre scrive come un mister, `aggiorna` in docs-actions). Società → Squadre, "Genera PIN": PIN
  personale se è anche staff (stesso nome, `chiaveNome`), se no quello che ha già in un'altra squadra, e va su tutte le sue righe;
  rigenerare il PIN di uno staff (`/api/staff`) aggiorna anche le sue righe da mister. Preparatori dei portieri: in Squadra → Rosa delle
  altre squadre segnano solo i portieri (`coach_portiere`, `segnaPortiere`).
  Doppio ruolo: in alto nell'intestazione "Direttore | Mister Under 15" (`getDoppioRuolo()` in `lib/mister.ts`, `/api/profilo?usa=`):
  con "mister" il cookie `acm_profilo` fa sì che `getProfilo()` (lib/auth.ts) restituisca null → per l'app è un mister e basta;
  `getAccount()` = l'account vero. Accesso e uscita tornano allo staff.

## Squadre (aree dell'app, `app/(aree)/`)
- Dati: tabella `docs` a chiave/valore (`shared/teams`, `roster/<squadra>`, `sheet/<squadra>` = foglio della partita,
  `registro/<squadra>`, `calendar/<squadra>`, `shared/schemes`, `shared/eventi`, `shared/avvisi`), permessi in
  `supabase/sicurezza.sql` e migrazioni: admin per email, mister e organizzativo solo via funzioni `coach_*` col PIN, direttori in
  lettura (0011) tranne `shared/teams` (0020) e i calendari (0034). Lettura: `leggiDocs`, `chiEntra` in `lib/portale-dati.ts`.
  Scrittura: `modificaDoc(path, modifiche)` in `app/(aree)/docs-actions.ts`, voce per voce per id (`lib/modifiche.ts`) sulla versione
  più recente (0048, coach_leggi/coach_salva o salva_doc); foglio della partita per campi con `aggiornaFoglio` (`useFoglio`).
- Squadre: `coaches: [{id, name, code}]` = mister con PIN personale (Società → Squadre, admin e direttori); `code` sulla squadra =
  vecchio PIN condiviso, valido finché l'admin non lo disattiva. `coach` = testo riassuntivo. `coach_team()` non restituisce mai PIN.
- Layout di `app/(aree)/` (fa entrare admin, direttori, segreteria e chi ha la tessera; ogni pagina controlla il suo ruolo),
  intestazione comune `components/Intestazione.tsx` con la barra delle aree (`components/Aree.tsx`, icone `ICONE_AREE` in
  `lib/condivisi.ts`) e le schede dell'area aperta (`components/SchedeArea.tsx`). Lo Scouting (`app/(app)/layout.tsx`) usa la stessa
  intestazione. Conferme prima di eliminare/ripristinare: `components/Conferma.tsx`.
- Regole comuni (calendari e colori, età della categoria, colori delle annate, iniziali e colore di chi valuta, icone, modelli degli
  avvisi, moduli `FORMATIONS`, colori dei compiti, schemi di partenza `BASES`) in `lib/condivisi.ts`, UNA volta sola.
- Società: Squadre (`/societa/squadre`, admin e direttori: squadre, mister e PIN con `cambiaSquadre(op)` in
  `app/(aree)/docs-actions.ts`, regole pure e PIN liberi in `lib/squadre-societa.ts`; scout, direttori e segreteria via `/api/staff`
  (crea, pin, nome, stato: il codice è la password dell'account, salvato anche in `codici_accesso`); backup con `esportaBackup` e, solo admin,
  "Ripristina da un backup" (`components/RipristinoBackup.tsx`, `confrontaBackup`/`ripristinaBackup` col file in FormData, regole in
  `lib/ripristino.ts`: confronto scheda per scheda, si rimettono solo quelle scelte; le versioni di prima restano nello Storico modifiche);
  `components/SquadreSocieta.tsx`), Archivio documenti (`/societa/archivio`, admin e direttori; PDF da `/societa/archivio/[id]`) e
  Storico modifiche (`/societa/modifiche`, solo admin), azioni in `app/(aree)/societa/actions.ts`.
- Segreteria → Tesserati (`/segreteria`, admin, direttori, segreteria: `gestisceSegreteria()`; la segreteria dopo il PIN arriva lì e
  vede solo quest'area).
- Navigazione (07/10/2026, controllo UX): l'area Modulistica non c'è più. Squadra = Rosa · Allenamento · Partite · Statistiche ·
  Calendario (`components/SchedeArea.tsx`); sottoschede nella pagina, che vanno a capo (`components/squadra/SottoSchede.tsx`:
  `SchedeAllenamento`, `SchedePartite` in tre gruppi: prima della partita (Dati, Convocazioni, Formazione, Piazzati), da stampare (Foglio
  gara, Distinta), dopo la partita (Tabellini); `SchedeStatistiche` = Dashboard, Allenamento, Partite, Campi solo dal 📌 delle Convocazioni). Gli indirizzi
  `/modulistica/distinta` (area Squadra → Partite) e `/modulistica/programma` (area Calendario) restano; `Aree.tsx`, `NomeArea.tsx`
  li assegnano all'area giusta. Titoli delle pagine brevi, senza il nome della squadra (è già nell'intestazione o nella scelta).
- Moduli (admin, direttori e mister; azioni in `app/(aree)/modulistica/actions.ts`): Distinta (`/modulistica/distinta`,
  `?squadra=` per lo staff, direttori in sola lettura, niente per l'organizzativo; `salvaDistinta` salva solo `distinta` e
  `senzaCategoria`; regole `lib/distinta.ts`, PDF `lib/pdf-distinta.ts`), Programma gare (`/modulistica/programma`, `lib/programma.ts`;
  un mister normale vede e stampa SOLO le sue squadre, non tutte: `squadreProgrammaMister()`; l'organizzativo e i preparatori
  dei portieri, come prima, tutte). Comunicazione è stata tolta: stesso PDF, dentro Calendario → Avvisi.
  Impaginazione comune in `lib/pdf-moduli.ts` (prove in `tests/pdf-moduli.test.mjs`). Ogni PDF scaricato lascia una copia nell'Archivio:
  `archiviaPdf(nome, tipo, blob, squadra)` riceve il file (Blob), non il testo base64 (un testo di oltre ~1 MB la server action lo
  rifiuta: "Maximum array nesting exceeded"); così anche `caricaDocumento` delle famiglie.
- Calendario (`/calendari/…`, non `/calendario`, che è la pagina dello Scouting): Tutte le squadre (`tutte`: vista
  Giorno/Elenco, admin, direttori e organizzativo cambiano amichevoli e tornei di ogni squadra ed eventi, Google con
  `/api/calendario-google`, che riconosce anche la tessera), Avvisi (`avvisi`: admin, direttori e organizzativo pubblicano
  nell'app (`shared/avvisi`) e stampano il PDF; un mister normale vede la stessa pagina ma solo per il PDF su carta intestata,
  squadra già scelta, senza pubblicare — `puoPubblicare`/`soloMiaSquadra` in `components/calendario/Avvisi.tsx`, prima
  era Modulistica → Comunicazione; `?evento=id` = bozza per un evento). "La mia squadra" si è spostata dentro Squadra →
  Calendario (vedi sotto): qui restava doppia con le pagine della Squadra. Componenti in `components/calendario/`,
  regole pure in `lib/calendario-portale.ts`, dati in `lib/portale-dati.ts` (`calendariTutti`).
- Home (`/inizio`; `/home` è la Home dello Scouting), stile A (colori del club su fondo chiaro): mister (prossima partita in grande con
  risposte delle famiglie e link al campo, avvisi, da fare, prossimi impegni, ultimo risultato coi marcatori, stagione e presenze mese
  per mese: calcoli in `lib/home.ts`, prove in `tests/home.test.mjs`; regole in `lib/registro.ts`); admin e direttori senza
  `?squadra=`: Home della società (`HomeSocieta`: weekend di tutte, risultati degli ultimi 10 giorni, da sistemare, scouting, stagione
  squadra per squadra), preparatori (weekend delle loro categorie con i portieri, `datiPreparatore`), organizzativo (weekend per
  calendario, eventi, avvisi), admin e direttori con `?squadra=`. I pulsanti verso la Squadra (`components/HomePortale.tsx`) prima
  creano quello che serve con `allenamentoDiOggi`, `tabellinoDi`, `preparaGara` (`app/(aree)/docs-actions.ts`) e poi aprono la pagina.
- Home di admin e direttori (07/10/2026): dashboard della società `components/DashboardSocieta.tsx` (componente server; dati preparati in
  `app/(aree)/inizio/page.tsx`): fascia blu con presenza media (linea mese per mese), partite, gol, segnalazioni per settimana; presenze per
  squadra, risultati V/N/P, weekend per calendario, imbuto dello scouting per stato, ultimi risultati, da sistemare; ogni riquadro con la
  sua spiegazione. "Amichevole" (interfaccia e dati: tipo, comp, convType) è diventato "Partita".
  Ogni profilo ha la sua Home-dashboard con la stessa fascia blu (`components/dashboard/Pezzi.tsx`: `Fascia`, `NumeroFascia`, `Sparkline`,
  `Colonne`, `Riquadro`, `BarraPct`): mister e preparatori (`HomeSquadra`: presenza, partite, gol, prossima), organizzativo (impegni per
  calendario, eventi), scout (`app/(app)/home`: sue segnalazioni per settimana, valutazioni, gare, incarichi; archivio per stato),
  segreteria (`Tesserati`: certificati, iscrizioni, quote in regola su tutti i tesserati, documenti da controllare), famiglie (prossima
  partita, convocazioni, certificato, avvisi).
- Squadra: pagine con `apriSquadra()` in `lib/pagina-squadra.ts` (chi entra, squadra, sola lettura dei direttori, `conSquadra()` per i
  link); scelta della squadra per lo staff `components/SceltaSquadra.tsx` (`?squadra=`); sotto-schede `components/squadra/SottoSchede.tsx`.
  Rosa (`/squadra/rosa`, `components/squadra/Rosa.tsx`): nomi, aggiunte ed eliminazioni solo admin (`eliminaGiocatore` toglie anche
  da formazione e panchina), ruolo anche il mister (`impostaRuolo`: registro.ruoli + registro.gk; da Under 13 in su ruoli completi,
  sotto portiere/movimento).
  Allenamento: Presenze (`/squadra/presenze`, `?allenamento=<id>`; nella squadra dei preparatori portieri divisi per preparatore
  secondo `coaches[].eta`, categoria del portiere dal nome nelle rose delle squadre, `lib/portieri.ts`), Test atletici (`/squadra/test`, solo Under 15, `?test=<id>`),
  Statistiche (`/squadra/statistiche-allenamento`, `?periodo=2026-09`), I miei allenamenti (lavori in corso). Regole in
  `lib/registro.ts` (`statisticheAllenamento`, `presenzePerMese`, `leggiTempo`).
  Partite: Dati partita (`/squadra/partita`) e Convocazioni (`/squadra/convocazioni`: agonistica con lo stato di ogni giocatore,
  attività di base da 1 a 4 partite, risposte delle famiglie con `risposteFamiglie()`, PDF `lib/pdf-convocazione.ts` con i link a
  Google Maps; "Nuova partita" con `svuotaFoglio`; regole in `lib/foglio.ts`), Formazione (`/squadra/formazione`,
  `components/squadra/Formazione.tsx`: tocca una posizione per scegliere, trascina per spostare, `slotPos`; regole in
  `lib/formazione.ts`), Piazzati (`/squadra/piazzati`, `?schema=<id>`: I miei schemi in registro.schemi, modelli della società in
  shared/schemes solo admin con `ordinaModelli`; editor `components/piazzati/` con campo SVG che trascina pedine e pallone, frecce,
  linee, scritte, e Compiti; regole pure in `lib/piazzati.ts`, prove in `tests/piazzati.test.mjs`), Foglio gara
  (`/squadra/foglio-gara`: anteprima e PDF A4 orizzontale `lib/pdf-foglio-gara.ts`, distinta e formazione poi una pagina per schema
  scelto; casella "Mostra la categoria" = `sheet.senzaCategoria`), Tabellini (`/squadra/tabellini`, `?partita=<id>`; agonistica
  minuti/gol/subiti/autogol/durata, attività di base presenti e risultato a tempi), Statistiche (`/squadra/statistiche-partite`) e
  Campi (`/squadra/campi`, posizione del cancello con `impostaCampo`, `lib/campi.ts`). Attività di base (da Under 13 in giù): solo
  Convocazioni e Tabellini. Report PDF delle statistiche (admin e direttori): `lib/report-statistiche.ts`. Disegno dei PDF a pagina
  intera su tela: `lib/tela.ts` (T, righeTesto, testoInRiquadro, tabella, intestazioneSocieta).
  Calendario (`/squadra/calendario`; prima "Calendario → La mia squadra", spostata qui perché restava doppia con le pagine
  della Squadra): calendario ufficiale, amichevoli del registro, eventi della squadra, Scarica Excel; preparatori dei portieri:
  le partite delle categorie dei loro portieri con la convocazione (`datiPreparatore`). Usa `apriSquadra()` come le altre pagine.
- Scouting dei mister (`/scouting/segnala`, `/scouting/giocatori`, `/scouting/valuta/[id]`; solo mister con la tessera, lo staff va al
  suo Scouting): `coach_segnala`, `coach_valuta`, `coach_giocatori`, `coach_societa` (`lib/scouting-mister.ts`, azioni in
  `app/(aree)/scouting/actions.ts`); moduli in comune con lo Scouting (`components/ModuloSegnalazione.tsx`,
  `components/ModuloValutazione.tsx`), "Già in lista" con l'elenco dell'annata, elenco `components/GiocatoriMister.tsx`.
- Excel: "Scarica Excel" (`components/ScaricaExcel.tsx`) in Rosa, Statistiche allenamento e partite, Calendario → La mia squadra: fogli
  costruiti nella pagina dagli stessi dati (permessi di chi guarda) con `lib/esporta.ts`, file creato nel browser da `lib/xlsx-scrivi.ts`
  (zip senza compressione, intestazione in grassetto e bloccata, filtro; prove in `tests/xlsx-scrivi.test.mjs`, `tests/esporta.test.mjs`).
- Importazioni da Excel/CSV con le colonne scelte da chi importa (`lib/import-tabella.ts`: lettura del file, intestazione sotto un titolo,
  colonne indovinate dai sinonimi, nomi "Cognome Nome" in qualsiasi ordine; `components/ColonneImport.tsx`; prove in
  `tests/import-tabella.test.mjs`): Rosa → "Importa da Excel o CSV" (admin, `components/squadra/ImportaRosa.tsx`: aggiunge solo i nuovi)
  e Segreteria → "Importa anagrafica" (`components/ImportaAnagrafica.tsx`, es. export di Golee: riga → giocatori delle rose con lo stesso
  nome, anche in più squadre; data di nascita, genitori, certificato, taglie; di norma solo nei campi vuoti, `unisciDati`).
- Esercitazioni (0052, `/esercitazioni`, LAVORI IN CORSO: solo l'admin, area nascosta agli altri in `components/Aree.tsx` e tabella
  `esercizi` con RLS `is_admin()`): eserciziario con scheda (tipo, fase e principio, obiettivo, categorie, formato, misure con Area per
  Giocatore e fascia, serie/minuti/recupero, giorno del morfociclo, testi; regole in `lib/esercizi.ts`, dal documento metodologico
  dell'utente in ~/Progetto ACM/ESERCIZIARIO), lavagna `components/esercizi/Lavagna.tsx` (giocatori, attrezzi, passaggio/corsa/dribbling,
  zone; cambiando le misure tutto segue in proporzione), Duplica con "Nato da", salvataggio automatico (`app/(aree)/esercitazioni/actions.ts`).
  Da fare (tappa 2): sedute in 4 fasi e PDF della seduta; poi l'apertura ai mister con una migrazione nuova.
- Famiglie (`/famiglia`, `/famiglia/calendario`, `/anagrafica`, `/segreteria`): `getFamiglia` → famiglia_get, azioni in
  `app/famiglia/actions.ts` (famiglia_rispondi, famiglia_contatti, famiglia_carica; foto ridotte nel browser), componenti in
  `components/famiglia/`.
- Colori e caratteri in `app/globals.css`; il verde resta solo per il campo e "presente".

## Chi sviluppa
L'utente sviluppa da solo con Claude, in VSCode, su Mac. Spiega i passaggi in italiano,
in modo semplice e concreto; indica sempre in quale file va ogni modifica e i comandi da lanciare.

## Stack
- Next.js 16 (App Router, TypeScript). Il middleware si chiama `proxy.ts`.
  Prima di usare API Next.js controlla la documentazione in `node_modules/next/dist/docs/`.
- Supabase: database Postgres, login, storage. Client in `lib/supabase/` (`server.ts` per server, `client.ts` per browser).
- Tailwind CSS v4: colori e font del club definiti in `app/globals.css` (`bg-blu`, `text-oro`, `font-display`…).
- Pubblicazione: Vercel, pagine preparate a Dublino (`vercel.json` → `regions: ["dub1"]`, accanto al database Supabase in Irlanda:
  da Washington ogni domanda al database attraversava l'oceano, pagine 2-3 volte più lente), variabili `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `PIN_ADMIN`, `SEGRETO_SESSIONE`
  (tessera dei mister, almeno 32 caratteri casuali).
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
  (via `lib/supabase/servizio.ts`, dopo aver verificato che chi chiama è admin o direttore) e in `lib/supabase/file.ts` (file dei
  contenitori privati `archivio` e `documenti-famiglie`, 0051: SOLO dopo che una funzione del database ha controllato chi chiede e ha
  dato il percorso: `archivio_registra`, `famiglia_registra`, `archivio_apri`, `documento_apri`). Mai nel browser.
- Testi dell'interfaccia in italiano, frasi brevi, verbi chiari ("Salva report", non "Invia").
- Mobile first: gli osservatori usano l'app dal telefono a bordo campo.

## Ruoli
`admin`, `direttore` (a capo di squadre e scout: vede tutto; **squadre del Portale in sola lettura, Società e Scouting
li modifica come l'admin**, 0018 e 0020),
`scout`, `mister` (tipo `public.ruolo`, tabella `profiles`). In `lib/ruoli.ts`: `vedeTutto()` = leggere tutto
(admin, direttori), `gestisce()` = modificare stati, gare, dati di tutti nello Scouting (admin e direttori, SQL `vede_tutto()`),
`puoSegnalare()` = admin, direttori e scout.
`profiles.squadre` (0053, solo `direttore`): `null` = tutte (come prima), altrimenti solo quegli id di `shared/teams`. Limita
SOLO Squadra, Home della società e Modulistica (`lib/ruoli.ts` → `filtraSquadreDirettore()`, usata da `squadreDelPortale` in
`lib/portale-dati.ts` e, a mano, nelle pagine che leggono `shared/teams` senza passare da lì: Home, Distinta, Comunicazione,
Programma gare). Società → Squadre, Scouting e Calendario "Tutte le squadre" restano SEMPRE completi per ogni direttore
(la Segreteria no, vedi sotto). Le squadre si scelgono in Società → Squadre (admin, `impostaSquadreDirettore`/
`imposta_squadre_direttore`); con `[]` (nessuna) l'area Squadra sparisce dalla barra (`components/Aree.tsx`, `nienteSquadre`).
RLS: `direttore_vede_doc(path)` blocca la lettura di `roster|sheet|registro/<squadra>` non assegnate (`docs`, policy
"direttori: sola lettura"). Segreteria (0055): un direttore la vede SOLO se l'admin gli dà `profiles.vede_segreteria`
(default false; admin e account `segreteria` la vedono sempre). `gestisceSegreteria(profilo)` in `lib/ruoli.ts` ↔ SQL
`gestisce_segreteria()`; si sceglie in Società → Squadre (checkbox per ogni direttore, `impostaSegreteriaDirettore`/
`imposta_segreteria_direttore`); senza il permesso l'area Segreteria sparisce dalla barra (`nienteSegreteria` in `Aree`)
e `/segreteria` rimanda a `/home`.
Solo admin/direttore/scout accedono a Scouting Hub (`puoAccedere()` in `lib/ruoli.ts`,
controllato in `app/(app)/layout.tsx`); `pannelloIniziale()` sceglie dove si arriva dopo il PIN.
I mister non hanno account personali: entrano nel Portale col PIN della squadra. `direttore` = ex "responsabile" (vede tutto, gestisce stati e gare),
`scout` = ex "osservatore" (segnala e valuta). `segreteria` (0030): solo Portale → Segreteria. Rinominati in 0004; se aggiungi
codice che confronta stringhe di ruolo, usa i nomi nuovi.

## Modello dati (supabase/migrations)
Storia delle migrazioni e delle funzioni: i file del vecchio Portale citati qui (`portale.js`, `core.js`, `schede.js`, `pdf.js`,
`registro.js`, …) non esistono più (Portale spento il 30/09/2026); le stesse regole sono nelle pagine dell'app descritte sopra.
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
  Colori dei tre calendari (`CALENDARI` in `lib/condivisi.ts`, come in Google dal 07/10/2026): Merate verde acqua #5FB3A7, Cernusco arancione #F6A94F, Trasferta verde #98C26C.
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
- 0030: ruolo `segreteria` (account personale col PIN, creato in Società → Segreteria via `/api/staff`); entra solo nell'area
  Segreteria (`/segreteria`; nel Portale `isSegreteria()` in `core.js` rimanda lì), non nello Scouting
- Intestazione unica dei documenti (fondo bianco: FIGC-SGS, ACADEMY / CASATESE MERATE / categoria, stemma): `intestazioneSocieta()` e
  `immagineIntestazione()` in `pdf.js`, usate da convocazioni (anche attività di base), report statistiche (`reportHeader` in
  `registro.js`), `intestazionePdf(doc, titolo, destra, categoria)` in `modulistica.js` (distinta, programma, comunicazione; pagine
  seguenti bianche con filo blu), fogli PIN (`lib/fogli-pin.ts`, in piccolo). Il foglio gara tiene la sua impaginazione ma su fondo
  bianco (niente fascia blu, riquadri bianchi con bordo, solo la sottile striscia blu-oro-rosso)
- 0051: PDF dell'archivio e documenti delle famiglie nei contenitori privati di Supabase Storage (`archivio`, `documenti-famiglie`,
  nessuna regola d'accesso: solo il server con `lib/supabase/file.ts`). Colonne `percorso` (i vecchi `dati`/`contenuto` ora vuoti):
  `archiviaPdf` → `archivio_registra` + carica; famiglia `caricaDocumento` → `famiglia_registra` + carica (riga tolta se il file non
  si salva); scarico da `/societa/archivio/[id]` (`archivio_apri`) e `/segreteria/documento/[id]` (`documento_apri`); l'eliminazione
  dall'archivio toglie anche il file. File vecchi spostati con `scripts/sposta-file-in-storage.mjs [--conferma]` (01/10/2026: 12 file);
  il backup sul Mac scarica anche i due contenitori.
- 0056: valutazione, la domanda sul ruolo cambia con l'età (`domandaRuolo()` in `lib/categorie.ts`, età sportiva): fino ai
  Pulcini (età ≤ 11) portiere o di movimento, Esordienti (12-13) portiere o la linea (obbligatoria), dall'Under 14 il ruolo preciso
  come prima. `valutazioni.ruolo_campo` per le prime due; il trigger `ruolo_da_valutazione` aggiorna `giocatori.ruolo` ("di
  movimento" non cancella una linea già nota) e toglie un `ruolo_preciso` non più coerente; `coach_valuta` riscritta.
  `components/ModuloValutazione.tsx` riceve `annata` e `ruolo`
- 0055: `profiles.vede_segreteria` (vedi ## Ruoli): un direttore vede l'area Segreteria solo se l'admin gliel'ha data (default
  false); riscrive `gestisce_segreteria()`, aggiunge `imposta_segreteria_direttore(profilo, vede)` (solo admin)
- 0053: `profiles.squadre` (vedi ## Ruoli) e preparatori dei portieri per categoria: `preparatore_puo(pin, squadra)` (la loro squadra
  sempre, le altre solo se l'età è tra `coaches[].eta`) usata da `coach_portiere` (riscritta) e dalle nuove `coach_presenza_portiere`
  (presenza a un allenamento) e `coach_tabellino_portiere` (minuti e gol subiti in una partita già creata dal mister). Nell'app:
  `lib/pagina-squadra.ts` calcola `soloPortieriScrivibile` (preparatore su un'altra squadra DELLE SUE categorie, confronto per nome in
  `coaches[]` come in `datiPreparatore`); `segnaPresenzaPortiere`/`segnaTabellinoPortiere` in `app/(aree)/docs-actions.ts` chiamano le
  due funzioni col PIN; `Presenze.tsx` e `Tabellini.tsx` abilitano solo le righe/celle dei portieri quando è vero (min e gol subiti,
  mai i gol fatti né "in porta in questa partita", che restano al mister).
- 0048: `docs.versione` (sale a ogni modifica, trigger `docs_versione`) e `modificato_da` (`chi_salva()`: mister da `app.chi`, se no
  l'account). Salvataggio con controllo: `salva_doc(path, data, versione)` (admin/direttori, RLS) e `coach_salva(pin, path, data, versione)`,
  lettura `coach_leggi`; se la scheda è cambiata restituisce quella nuova e il Portale unisce (`unisci(base, mio, loro)` in
  `public/portale/js/unisci.js`, elenchi con id voce per voce, prove in `tests/portale-unisci.test.mjs`) e riprova. Negli adattatori di
  `core.js` (`basiDocs` = versione di partenza, aggiornata solo se il Portale mostra la scheda arrivata); senza la 0048 salvano come prima.
  `docs_storico` (una versione ogni 10 minuti per scheda, 30 giorni, lettura solo admin) e `ripristina_doc(id)`: Società → Storico
  modifiche (`/societa/modifiche`)
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
  Li vedono e scaricano admin e direttori (`archivio_scarica(id)`), li elimina l'admin: Società → Archivio documenti (`/societa/archivio`).
  Esclusi i fogli PIN delle famiglie (credenziali) e il backup JSON. Valutazioni nominali: iniziali colorate `components/Autore.tsx`
  (`firma()`, `Autori`) nell'elenco Giocatori, nelle Necessità e nella scheda (medie e storico, con "Elimina" per admin, direttori e
  autore); nel Portale `autoreTondo()`
- 0038: `calendari_squadre()` (admin, direttori, scout): squadre del Portale (senza organizzazione e preparatori) con le sole
  partite (data, ora, avversario, casa, campo, tipo). Tutte le annate, colori come `calDi()` del Portale, periodo (weekend, 2
  settimane, stagione) e squadra: ora è la scheda "Calendario squadre" dentro `/gare` (`CalendarioSquadre`), non più una
  pagina a sé (`/calendario` resta solo come rimando per i link vecchi)
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
  Programma gare dal–al (ora nell'app, `/modulistica/programma`; PDF in ordine di categoria, dalla più grande, poi giorno e ora: `ordineProgramma` in `lib/programma.ts`), Comunicazione (`viewComunicazione`, modelli degli avvisi; PDF con la stessa intestazione della convocazione,
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
  Segreteria: pagina dell'app `/segreteria` (tappa 3, `components/Tesserati.tsx`), PIN alla famiglia col foglio PIN in PDF (`lib/fogli-pin.ts`, 8 per pagina).
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
`lib/calendario-google.ts`, chiamate a Google in `lib/google-calendar.ts` (ogni funzione riceve il collegamento `Google`).
Collegamento dall'app (0049): l'admin tocca "Collega a Google Calendar" in Calendario → Tutte le squadre (`PannelloGoogle`) →
`/api/google/collega` → Google → `/api/google/ritorno`: token di rinnovo cifrato con SEGRETO_SESSIONE (`cifraTesto` in `lib/tessera.ts`)
in `google_collegamento` (nessun accesso diretto: `google_leggi(pin)`, `google_salva`, `google_scollega`, `google_letto`), calendari
proposti dal nome e scelti dall'admin (`app/(aree)/calendari/google-actions.ts`). Credenziali dell'app: `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET` (OAuth "Applicazione web", ritorno `/api/google/ritorno`; app pubblicata, se no il permesso scade in 7 giorni);
quale collegamento usare in `lib/google-collegato.ts` (prima quello dell'app, se no l'account di servizio: `GOOGLE_SERVICE_ACCOUNT` +
`GCAL_ID_MERATE/CERNUSCO/TRASFERTA`). Solo variabili d'ambiente, mai nel codice. All'apertura di Tutte le squadre (`azione: 'auto'`)
si rilegge Google se sono passati 30 minuti.
Import da file (Calendario → Tutte le squadre → "Importa da file", `components/calendario/ImportaFile.tsx`; admin, direttori,
organizzativo): ICS, CSV, Excel .xlsx letti nel browser (`lib/import-calendario.ts`, lettore xlsx senza librerie `lib/xlsx.ts`, prove in
`tests/import-calendario.test.mjs` con `tests/dati/calendario-prova.xlsx`), anteprima con squadra e casa/trasferta, salvataggio con
`modificaDoc`; `fonte` sulla voce = non si importa due volte. Solo amichevoli, tornei ed eventi (mai il campionato); niente invio a Google
delle voci importate (spesso vengono da lì).
Calendari ufficiali in PDF dall'app (Calendario → Tutte le squadre → "Importa calendario ufficiale (PDF)", `components/calendario/ImportaUfficiale.tsx`;
admin e direttori): il PDF si legge sul server (`app/(aree)/calendari/ufficiale-actions.ts`: `anteprimaUfficiale`, poi `importaUfficiale`,
tutte e due ricevono il file). `lib/leggi-pdf.ts` (unpdf: parole con la posizione, punti e date spezzate riattaccati, linee dritte
DISEGNATE con le trasformazioni del PDF, niente ritagli) → `lib/calendario-pdf.ts` (stesse regole di leggi_pdf.py e prepara.py:
colonne dai trattini, giornate, A./R., elenco campi dalla tabella coi bordi `campiDaTabella` (bordi lunghi, solo quelli che attraversano
la riga) o dalle intestazioni, delegazioni con "|"; abbinamento nomi, data del fine settimana, ora del campo di casa;
`indovinaCategoria` dal nome del file e dal testo) → `lib/importa-calendario-ufficiale.ts` (come importa.mjs e portale.mjs: gare
"da calendario", confermate/variate non toccate, chiave di una partita già in archivio riusata se le società sono le stesse = niente
doppioni; nostre partite nel `calendar/<squadra>` della categoria con `aggiorna` di `lib/aggiorna-doc.ts`). Confronto con Python su 25
PDF: date, ore e campi uguali su 18.196 partite (`private/confronta-calendari.mjs`, `private/simula-import.mjs`); prove in
`tests/calendario-pdf.test.mjs` (PDF finto fatto con jsPDF). Gli script di `scripts/import-calendari/` restano per i comunicati.
Calendari dell'attività di base (Esordienti…Piccoli amici, per lo Scouting): `scripts/import-calendari/adb.mjs [cartella] [--conferma]`
(con `--import ./tests/registra.mjs`), PDF delle delegazioni in `private/calendari-adb/`; un PDF con più categorie (Monza) si divide per
intestazione, categoria con le annate ("Pulcini 10 anni Monza - 2016": il filtro "Anno di nascita" di `/gare` la legge con `etaDaCategoria`).
Gironi anche numerati; nomi tagliati dal PDF collegati alla società che iniziano così (`collega`); `ALIAS` nello script per gli altri.
Importati 07/10/2026: Monza (C.U. 15) e Lecco (C.U. 15), 3272 partite.
Il percorso è escluso dal controllo login di `lib/supabase/sessione.ts` (controlla da solo chi chiama).

Coordinate dei campi (distanze nel pannello Gare): `scripts/geocodifica-campi.mjs [--tutte] [--conferma]` le ricava da
OpenStreetMap (`scripts/lib/luoghi.mjs`: Nominatim, 1 richiesta al secondo, posizione accettata solo se nel comune giusto)
dall'indirizzo del campo o dal centro del paese. `portale.mjs` fa lo stesso per le gare dell'Academy (`gare.lat/lon`).
Calendario delle squadre (`calendar/<squadra>`): ogni partita collegata ha `venue` (campo scritto come nel calendario/comunicato),
`address`, `ll` ("lat,lon"); le convocazioni li leggono dal calendario (`luogoPartita()` in `lib/foglio.ts`), il ritrovo (`meetAddress`)
solo se altrove.

## Convenzioni del codice
- Form = Server Action che, a fine lavoro, fa `redirect` con `?ok=` o `?errore=` (mostrati da `<Avviso>`).
- Società sempre tramite `trovaOCreaSocieta()` (lib/societa.ts), mai insert diretti: evita i doppioni.
- Date e ore sempre in fuso `Europe/Rome` (`istanteItaliano`, `dataOraBreve` in lib/utili.ts);
  per "adesso" nei componenti server usa `istanteTraOre()` (la regola di lint vieta `Date.now()` nel render).
- Tipi SQL ↔ TypeScript allineati in `lib/tipi.ts`: se aggiungi uno stato, aggiornalo in entrambi.

## Prove rapide
`npm run prove` = lint, tipi, regole di calcolo (`npm run prove:regole`: `tests/*.test.mjs` con `node --test`, indirizzi `@/` tradotti da
`tests/registra.mjs`; categorie, testi e date, doppioni, 3 valutazioni in `lib/valutazioni.ts`, calendari Google, formazione, piazzati,
Home, impaginazione dei moduli), `scripts/prove-portale.mjs` (il vecchio Portale resta spento: solo gli stemmi in `public/portale/`,
vecchi indirizzi verso la Home, nessun rimando `/portale/#…` nel codice), build. Il giro delle pagine con i profili veri è nel Test dei
profili (sotto). Le stesse partono da sole su GitHub a ogni salvataggio (`.github/workflows/prove.yml`,
"Prove rapide", senza segreti): se falliscono arriva un'email. Prima di pubblicare su Vercel lanciare `npm run prove`.
Il token di `gh` non ha il permesso `workflow`: i file in `.github/workflows/` si creano dal sito di GitHub.

## Test dei profili
`node --env-file=.env.local scripts/test-profili.mjs private/test-profili.json`: permessi di tutti i profili sul database e
giro completo del sito vero con ogni profilo (identità di prova temporanee, cancellate alla fine). Rifarlo dopo modifiche a
permessi, migrazioni o navigazione. Il giro nel browser segue, profilo per profilo, la barra delle aree e le schede di ogni
area (fino a 60 pagine; preparatori e direttori anche un'altra squadra), le pagine delle famiglie, la segreteria e lo Scouting.
Parte anche ogni notte su GitHub (`.github/workflows/notte.yml`, "Prova notturna dei profili", segreti del repository
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; `CHROME_PATH`): a video solo nomi delle prove fallite,
conteggi e tipo del problema (frasi fisse, mai testo delle pagine: registri pubblici), esce con errore se qualcosa non va.
Un profilo che fallisce si riprova una volta (riga "↻ riprovato"): conta il secondo giro.

## Lavoro senza rete (bordo campo)
Salvataggio automatico (`useSalva` in `components/calendario/salvataggio.tsx`: presenze, tabellini, test, rosa, calendario,
avvisi, piazzati): ogni modifica va PRIMA sul telefono (`lib/coda-offline.ts`, localStorage `acm_coda`, voce per voce per id)
e poi al server con `modificaDoc`; senza rete resta lì ("Senza rete: salvato sul telefono…") e la manda `InviaInSospeso`
(nell'intestazione: all'apertura, al ritorno della rete, ogni minuto; striscia oro con quante modifiche aspettano). Ogni voce
ricorda di chi è (id dell'account o nome + squadre del mister, mai il PIN): su un telefono condiviso non si mandano quelle
dell'altro; dopo 7 giorni si buttano. Accesso scaduto o intoppi del server: restano e ripartono; rifiuti per permessi
(`rifiutoDefinitivo`): tolte. Moduli di segnalazione e valutazione: `components/BozzaModulo.tsx` salva la bozza mentre si
scrive (solo i campi cambiati), la rimette riaprendo la pagina ("Bozza ritrovata" · "Ricomincia da capo"), blocca Salva
senza rete (prima che parta l'azione, fase di cattura) e cancella la bozza alla pagina dopo un invio riuscito (non se si torna
con `?errore=` o si ricarica la stessa pagina). I voti a pulsanti (`SceltaRapida`) si rimettono con l'evento `ripristina`.
Prova nel browser: `private/prova-senza-rete.mjs` (rete staccata e riattaccata, tocca una presenza e la rimette com'era).
Non coperti (si salvano subito come prima): foglio della partita (`aggiornaFoglio`), Società → Squadre, presenze/tabellini
dei preparatori sulle altre squadre, PDF.

## Avviso errori in produzione (Sentry)
Ogni errore del sito in produzione (server e browser) va a Sentry (sentry.io, organizzazione `jacopo-marafante`, progetto
`javascript-nextjs`) e manda un'email. `NEXT_PUBLIC_SENTRY_DSN` (pubblico, va bene nel browser) e `SENTRY_AUTH_TOKEN`
(solo per caricare i source maps alla pubblicazione, mai nel browser) su Vercel (prod+preview) e in `.env.local`; senza
`NEXT_PUBLIC_SENTRY_DSN` Sentry resta spento (`enabled: false`), niente errori né rallentamenti.
File: `instrumentation-client.ts` (browser), `sentry.server.config.ts` e `sentry.edge.config.ts` (server e `proxy.ts`,
caricati da `instrumentation.ts` secondo `NEXT_RUNTIME`), `app/global-error.tsx` (se va in errore l'intero layout, raro:
manda l'errore a mano, gli altri casi li cattura da sé `instrumentation.ts` con `onRequestError`). `next.config.ts` avvolge
la configurazione con `withSentryConfig` (da `@sentry/nextjs/config`, non da `@sentry/nextjs`) per caricare i source maps a
ogni build; il dominio di Sentry (ricavato dal DSN) è aggiunto al `connect-src` della CSP, altrimenti il browser non
potrebbe mandargli gli errori. Solo errori (`tracesSampleRate: 0`, niente tracing delle prestazioni: non serve qui).

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
