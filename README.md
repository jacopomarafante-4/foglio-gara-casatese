# 📋 Foglio Gara · Casatese Merate

App web multi-squadra per gestione rosa, formazione e calci piazzati.

## 📁 Struttura

```
foglio-gara-casatese/
├── src/
│   ├── index.html              ← App principale
│   └── casatese-logo.png        ← Logo società
├── docs/
│   └── Foglio_gara_presentazione_Casatese.pdf
├── scripts/
│   ├── patch.py                ← Genera multi-squadra da single-file
│   └── deck_casatese.py        ← Genera PDF presentazione
├── data/
│   ├── seed_shared_teams.json          ← Squadre (Juniores, Allievi)
│   ├── seed_shared_schemes.json        ← Archivio schemi
│   ├── seed_roster_t_jun.json          ← Rosa Juniores
│   ├── seed_roster_t_all.json          ← Rosa Allievi
│   ├── seed_sheet_t_jun.json           ← Foglio gara Juniores
│   └── seed_sheet_t_all.json           ← Foglio gara Allievi
└── README.md
```

## 🚀 Uso

### Come app web standalone
1. Apri `src/index.html` nel browser
2. Il logo viene cercato nella stessa cartella

**Nota:** se il browser blocca il caricamento del logo (CORS), 
fai partire un mini server:
```bash
# Con Python 3
python -m http.server 8000

# Poi apri: http://localhost:8000/src/index.html
```

### Con VSCode
1. Apri questa cartella in VSCode
2. Installa **Live Server** extension (Ritchie's Live Server)
3. Clicca destro su `src/index.html` → "Open with Live Server"
4. Il browser si apre automaticamente con hot-reload

### Ruoli
- **Admin** (tu): crea squadre, gestisci rose, disegna schemi
- **Mister** (collega): accede con link (`#squadra=CODE`), compila formazione

## 📊 Dati

I dati sono salvati in:
- **Browser**: `localStorage` (fallback locale)
- **Cloud** (opzionale): database Claude (sincronizzazione in tempo reale)

I file JSON in `data/` sono snapshot di prova.

## 🎨 Personalizzazione

### Colori Casatese
Nella sezione `<style>` di `src/index.html`:
```css
--grass: #003DA5;      /* Blu ufficiale */
--red: #C41E3A;        /* Rosso ufficiale */
--amber: #D4AF37;      /* Oro ufficiale */
```

### Logo
Sostituisci `src/casatese-logo.png` con il tuo file (consigliato: PNG 1080×1080)

## 📱 Multi-squadra

Aggiungi nuove squadre dalla tab **Squadre** (admin only):
1. Nome squadra (es. "Allievi U16")
2. Categoria (es. "U16")
3. Mister (es. "Collega")
4. Codice accesso (es. "ALL-4P9M")

Condividi il link: `app.html#squadra=ALL-4P9M`

## 📄 PDF

Scarica il foglio gara in PDF dalla tab **PDF**:
- Distinta giocatori con numeri
- Formazione disegnata sul campo
- Calci piazzati scelti

## 🔧 Script Python

### `scripts/patch.py`
Trasforma la versione single-file in multi-squadra (già applicato).

```bash
python scripts/patch.py
```

### `scripts/deck_casatese.py`
Rigenerana il PDF di presentazione.

```bash
python scripts/deck_casatese.py
```

Richiede: `reportlab`, `pillow`
```bash
pip install reportlab pillow
```

## 📞 Supporto

- **Dati non salvano?** Controlla la console del browser (F12 → Console)
- **Logo non appare?** Assicurati che `casatese-logo.png` sia nella stessa cartella di `index.html`
- **Link non funziona?** Apri la console e verifica che il codice squadra sia corretto

## 📅 Prossimi step

- [ ] Inserire rosa con numeri reali
- [ ] Testare link con il collega
- [ ] Raccogliere feedback su UX
- [ ] (Opzionale) Accesso sicuro con login
- [ ] (Opzionale) App mobile
- [ ] (Opzionale) Archivio partite e statistiche

---

**Creato**: 23 settembre 2026  
**Casatese Merate** ⚽
