# Roadmap

Documento di progetto: https://claude.ai/code/artifact/ccfafc8e-f622-424e-82c9-9c598bb6bb2c

## Da fare subito (sul tuo Mac)
- [ ] `npm install`
- [ ] Progetto Supabase (Frankfurt), iscrizioni pubbliche disattivate
- [ ] Migrazioni 0001, 0002, 0003 eseguite in ordine
- [ ] Coordinate esatte delle sedi (tabella `sedi`)
- [ ] Account admin + 6 account del team (`npm run crea-utenti`)
- [ ] Prova completa: segnalazione, valutazione, cambio stato, gara prenotata

## Fatto nel codice
- [x] Accesso, ruoli, permessi nel database, cambio password
- [x] Segnalazione rapida con riconoscimento dei giocatori già presenti
- [x] Archivio giocatori con filtri
- [x] Scheda giocatore: storia, medie, stato, contatti protetti, modifica dati
- [x] Valutazione a 4 aree + giudizio finale
- [x] Gare da vedere: squadre seguite, distanza da Casatenovo/Merate, "Ci vado io", importazione incollando

## Prossimi passi
- [ ] Importazione dal Google Sheet: script `scripts/import-sheet/` (pulizia nomi, società e alias,
      duplicati, Note 25/26 → stato ed esito, contatti nella tabella protetta)
- [ ] Unione di due schede doppie (per i responsabili)
- [ ] Eventi: open day e provini con presenze ed esito
- [ ] Vista a colonne per stato (kanban) per i responsabili
- [ ] Lettura automatica delle gare da comunicati PDF / Tuttocampo
- [ ] Pubblicazione: GitHub + Vercel
- [ ] PWA installabile (icona sul telefono), export Excel
- [ ] Gestione utenti dall'app (oggi da script o SQL)

## Domande aperte
- Scala voti 1–5 o 1–10?
- Posizioni: 4 ruoli (portiere, difensore, centrocampista, attaccante) bastano, o servono le linee 1°–3°?
- Tempi di conservazione dei dati dei giocatori chiusi (privacy)
