"""Genera i 4 manuali (HTML → PDF con Chrome): generale, mister, scout, direttori."""
from pathlib import Path

QUI = Path(__file__).parent
IMG = QUI / 'img'
ROOT = Path('/Users/jm4/Progetto ACM/foglio-gara-casatese')
FONT = ROOT / 'node_modules/@fontsource'
LOGO = ROOT / 'public/portale/casatese-logo.png'
SITO = 'academy-casatese.vercel.app'
DATA = '25 settembre 2026'

CSS = f"""
@font-face{{font-family:Barlow;font-weight:400;src:url('file://{FONT}/barlow/files/barlow-latin-400-normal.woff2')}}
@font-face{{font-family:Barlow;font-weight:600;src:url('file://{FONT}/barlow/files/barlow-latin-600-normal.woff2')}}
@font-face{{font-family:'Barlow Condensed';font-weight:600;src:url('file://{FONT}/barlow-condensed/files/barlow-condensed-latin-600-normal.woff2')}}
@font-face{{font-family:'Barlow Condensed';font-weight:700;src:url('file://{FONT}/barlow-condensed/files/barlow-condensed-latin-700-normal.woff2')}}
@page{{size:A4;margin:16mm 16mm 18mm}}
:root{{--blu:#003da5;--oro:#d4af37;--rosso:#c41e3a;--ink:#0e1a2b;--grigio:#5b6b80;--linea:#d8dfe8;--carta:#f5f7fa;--verde:#2f6b45}}
*{{box-sizing:border-box}}
body{{margin:0;font-family:Barlow,sans-serif;font-size:10.6pt;line-height:1.48;color:var(--ink)}}
h1,h2,h3{{font-family:'Barlow Condensed',Barlow,sans-serif;line-height:1.1}}
h2{{font-size:20pt;color:var(--blu);margin:0 0 3mm;padding-bottom:1.8mm;border-bottom:1.1mm solid var(--linea);break-after:avoid}}
h3{{font-size:13.5pt;margin:4.5mm 0 1.5mm;break-after:avoid}}
p{{margin:0 0 2.3mm}} ul,ol{{margin:0 0 3mm;padding-left:5.5mm}} li{{margin:0 0 1.1mm}}
section{{break-before:page}}
.cover{{height:255mm;display:flex;flex-direction:column}}
.cover .top{{background:var(--blu);color:#fff;padding:20mm 13mm 14mm;border-radius:3mm 3mm 0 0}}
.cover img{{width:24mm;height:24mm;background:#fff;border-radius:3mm;padding:1.5mm}}
.cover h1{{font-size:36pt;margin:7mm 0 2mm}}
.cover .sub{{font-size:14pt;opacity:.92}}
.stripe{{display:flex;height:2.2mm}} .stripe i{{display:block}}
.cover .meta{{margin-top:auto;color:var(--grigio);font-size:10pt}} .cover .meta b{{color:var(--ink)}}
table{{width:100%;border-collapse:collapse;margin:1mm 0 4mm;font-size:9.6pt}}
th{{text-align:left;font-family:'Barlow Condensed';font-size:10.5pt;color:#fff;background:var(--blu);padding:1.5mm 2.2mm}}
td{{padding:1.3mm 2.2mm;border-bottom:.25mm solid var(--linea);vertical-align:top}}
tr{{break-inside:avoid}}
.box{{border-left:1.2mm solid var(--oro);background:var(--carta);padding:2.6mm 3.6mm;margin:3mm 0;border-radius:0 2mm 2mm 0;break-inside:avoid}}
.box.rosso{{border-left-color:var(--rosso)}} .box.blu{{border-left-color:var(--blu)}}
.box b.t{{display:block;font-family:'Barlow Condensed';font-size:12pt;margin-bottom:1mm}}
.si,.no{{display:grid;grid-template-columns:1fr 1fr;gap:5mm}}
.col h3{{margin-top:0}}
.ok li::marker{{content:'✓  ';color:var(--verde);font-weight:700}}
.ko li::marker{{content:'✕  ';color:var(--rosso);font-weight:700}}
.fig{{display:grid;grid-template-columns:52mm 1fr;gap:6mm;align-items:start;margin:2mm 0 4mm;break-inside:avoid}}
.fig img{{width:52mm;border:.3mm solid var(--linea);border-radius:3mm;box-shadow:0 1mm 3mm rgba(0,0,0,.08)}}
.fig.stretta img{{max-height:98mm;object-fit:cover;object-position:top}}
.duo{{display:grid;grid-template-columns:1fr 1fr;gap:5mm;margin:2mm 0 4mm;break-inside:avoid}}
.duo img{{width:100%;border:.3mm solid var(--linea);border-radius:3mm;max-height:105mm;object-fit:cover;object-position:top}}
.cap{{font-size:8.8pt;color:var(--grigio);margin-top:1mm}}
.passi{{counter-reset:p;list-style:none;padding-left:0}}
.passi li{{counter-increment:p;padding-left:8mm;position:relative}}
.passi li::before{{content:counter(p);position:absolute;left:0;top:.3mm;width:5.2mm;height:5.2mm;border-radius:50%;background:var(--blu);color:#fff;font-family:'Barlow Condensed';font-weight:700;font-size:9pt;display:grid;place-items:center}}
.k{{font-family:'Barlow Condensed';font-weight:700;background:var(--carta);border:.3mm solid var(--linea);border-radius:1.2mm;padding:0 1.4mm;white-space:nowrap}}
.small{{font-size:8.8pt;color:var(--grigio)}}
"""


def img(nome, cap='', stretta=True):
    return f'<img src="file://{IMG / (nome + ".png")}" alt="">' + (f'<div class="cap">{cap}</div>' if cap else '')


def fig(nome, testo, cap=''):
    return f'<div class="fig stretta"><div>{img(nome, cap)}</div><div>{testo}</div></div>'


def duo(a, ca, b, cb):
    return f'<div class="duo"><div>{img(a, ca)}</div><div>{img(b, cb)}</div></div>'


def copertina(titolo, sotto, per):
    return f"""<div class="cover"><div class="top"><img src="file://{LOGO}" alt="">
    <h1>{titolo}</h1><div class="sub">{sotto}</div></div>
    <div class="stripe"><i style="flex:6;background:var(--blu)"></i><i style="flex:1;background:var(--oro)"></i><i style="flex:2;background:var(--rosso)"></i></div>
    <div class="meta"><p><b>Per:</b> {per}</p><p><b>Indirizzo dell'app:</b> {SITO}</p>
    <p><b>Versione:</b> 1 · {DATA}</p><p class="small">Documento per lo staff dell'Academy Casatese Merate. Le schermate usano dati di esempio.</p></div></div>"""


ACCESSO = f"""
<h3>Come si entra</h3>
<ol class="passi">
<li>Apri <b>{SITO}</b> dal browser del telefono, del tablet o del computer.</li>
<li>Scrivi il tuo <b>PIN personale</b> e tocca <span class="k">Entra</span>. Il PIN dice all'app chi sei e ti porta nella tua area.</li>
<li>Per uscire tocca <span class="k">Esci</span> in alto, accanto al tuo nome.</li>
</ol>
<div class="box blu"><b class="t">Niente accesso automatico</b>
Il PIN si rimette ogni volta che riapri l'app: quando chiudi il browser e comunque dopo 6 ore dall'ultimo accesso.
È voluto: se perdi il telefono, nessuno trova l'app già aperta.</div>
"""

REGOLE = """
<h3>Il tuo PIN</h3>
<ul>
<li>È <b>personale</b>: non si presta, non si scrive nei gruppi, non si manda per messaggio a nessuno.</li>
<li>Se pensi che qualcuno lo conosca, o lo hai dimenticato, chiedi all'amministratore un <b>PIN nuovo</b>: quello vecchio smette subito di funzionare.</li>
<li>Se sbagli il PIN più volte, o se qualcuno sta provando PIN a caso, l'app blocca gli ingressi per qualche minuto e scrive
"Troppi PIN sbagliati": aspetta e riprova.</li>
</ul>
<h3>I dati dei ragazzi</h3>
<ul>
<li>Nell'app ci sono dati di <b>minorenni</b>: nomi, date di nascita, valutazioni, presenze, contatti delle famiglie.
Si usano solo per l'attività del settore giovanile.</li>
<li><b>Non</b> si fanno screenshot da girare in chat, <b>non</b> si inoltrano elenchi, valutazioni o contatti a chi non è dello staff.</li>
<li>Nelle note si scrivono solo cose <b>tecniche e sportive</b>. Mai informazioni su salute, famiglia, scuola,
situazioni personali, e mai giudizi offensivi.</li>
<li>Su un telefono o computer usato da altri tocca sempre <span class="k">Esci</span> quando hai finito.
Tieni il telefono protetto da codice o impronta.</li>
</ul>
"""


def pagina(titolo, corpo):
    return f'<!doctype html><html lang="it"><head><meta charset="utf-8"><title>{titolo}</title><style>{CSS}</style></head><body>{corpo}</body></html>'


# ---------------------------------------------------------------- GENERALE
generale = copertina('Manuale generale', "Portale squadre e Scouting: come funziona l'app, chi fa cosa, regole per tutti",
                     'tutto lo staff: direttori, mister, scout') + f"""
<section>
<h2>1. Cos'è l'app</h2>
<p>È l'app del settore giovanile dell'Academy Casatese Merate. Un solo indirizzo, <b>{SITO}</b>, con due parti:</p>
<ul>
<li><b>Portale squadre</b>: la vita di ogni squadra. Rosa, calendario, convocazioni, formazione, calci piazzati,
foglio gara in PDF, presenze agli allenamenti, test atletici, statistiche.</li>
<li><b>Scouting</b>: i ragazzi osservati di altre società. Segnalazioni dal campo, valutazioni, eventi (open day, provini),
gare da andare a vedere, storico delle squadre in cui hanno giocato.</li>
</ul>
<p>Funziona dal browser, senza installare niente: telefono, tablet o computer. È pensata soprattutto per il telefono.</p>
{fig('s-pin', ACCESSO + '<p class="small">Chi ha più ruoli usa comunque un solo PIN, quello che gli ha dato l’amministratore.</p>', 'La pagina d’ingresso: solo il PIN.')}
</section>

<section>
<h2>2. Chi fa cosa</h2>
<table>
<tr><th style="width:18%">Ruolo</th><th style="width:25%">Dove entra</th><th>Cosa vede e cosa può fare</th></tr>
<tr><td><b>Amministratore</b></td><td>Portale, Società e Scouting</td><td>Gestisce tutto: squadre, rose, calendari, schemi, PIN di tutti,
stati dei giocatori osservati, gare da vedere, importazione delle distinte.</td></tr>
<tr><td><b>Direttore</b></td><td>Portale (tutte le squadre), Società, Scouting</td><td><b>Squadre: vede tutto, non modifica.</b>
<b>Società e Scouting: modifica come l'amministratore</b> (squadre, mister, scout, direttori e PIN; segnala, valuta,
cambia gli stati, gestisce gare e doppioni).
Vede anche PIN e contatti delle famiglie.</td></tr>
<tr><td><b>Mister</b></td><td>Portale, solo la sua squadra</td><td>Prepara le partite (convocazioni, formazione, foglio gara), segna presenze,
test e tabellini, guarda le statistiche, segnala giocatori allo scouting. Non vede l'archivio scouting.</td></tr>
<tr><td><b>Scout</b></td><td>Scouting</td><td>Segnala e valuta giocatori, registra open day e provini, sceglie le gare da vedere.
Non cambia lo stato dei giocatori e non vede il Portale.</td></tr>
</table>
<h3>Come è fatta ogni pagina</h3>
{fig('p-home', '''<ul>
<li><b>Intestazione blu</b>: il nome dell'app, il tuo ruolo (<span class="k">MISTER</span>, <span class="k">SCOUT</span>,
<span class="k">DIRETTORE</span>…), il tuo nome o la tua squadra, e <span class="k">Esci</span>.</li>
<li><b>Barra delle aree</b>, sempre in alto: Home, Squadra, Gara, Allenamento, Statistiche, Scouting, Società.
Ognuno vede solo le aree che gli servono. Se non ci stanno tutte, la barra scorre di lato.</li>
<li><b>Schede</b>, sotto la striscia colorata: le parti dell'area aperta (per esempio in Gara: Partita, Convocazioni,
Formazione, Piazzati, Foglio gara PDF).</li>
<li>Il <b>logo</b> in alto riporta sempre alla Home.</li>
</ul>''', 'La Home di un mister.')}
</section>

<section>
<h2>3. Regole per tutti e responsabilità</h2>
{REGOLE}
<h3>Dati giusti e aggiornati</h3>
<ul>
<li>L'app vale quanto i dati che contiene: inseriscili <b>subito</b> (lo stesso giorno) e <b>con cura</b>.</li>
<li>Se trovi un errore che non puoi correggere tu (un ragazzo nella squadra sbagliata, un nome scritto male,
una partita mancante) scrivilo all'amministratore.</li>
<li>Le modifiche si salvano da sole: in alto compare <i>Salvataggio…</i> e poi <i>Salvato</i>. Aspetta <i>Salvato</i>
prima di chiudere, soprattutto con una connessione debole.</li>
</ul>
<div class="box rosso"><b class="t">In sintesi</b>PIN personale e segreto · dati dei ragazzi solo nell'app, mai in chat ·
note solo tecniche · <span class="k">Esci</span> sui dispositivi condivisi · errori all'amministratore.</div>
</section>

<section>
<h2>4. Consigli pratici</h2>
<h3>Mettere l'app sulla schermata Home del telefono</h3>
<ul>
<li><b>iPhone (Safari)</b>: apri {SITO} → tasto <span class="k">Condividi</span> → <span class="k">Aggiungi alla schermata Home</span>.</li>
<li><b>Android (Chrome)</b>: apri {SITO} → menu <span class="k">⋮</span> → <span class="k">Aggiungi a schermata Home</span>.</li>
</ul>
<p>Compare un'icona come quella di un'app; il PIN si chiede comunque ogni volta.</p>
<h3>Problemi frequenti</h3>
<table>
<tr><th style="width:36%">Cosa succede</th><th>Cosa fare</th></tr>
<tr><td>"PIN non riconosciuto"</td><td>Controlla le cifre. Se è giusto, forse è stato rigenerato: chiedi il PIN nuovo all'amministratore.</td></tr>
<tr><td>"Troppi PIN sbagliati: riprova tra qualche minuto"</td><td>Protezione contro chi prova PIN a caso. Aspetta qualche minuto e riprova.</td></tr>
<tr><td>Mi chiede di nuovo il PIN</td><td>Normale: succede dopo 6 ore, se hai chiuso il browser, o se hai toccato Esci.</td></tr>
<tr><td>Vedo la versione vecchia o qualcosa non si muove</td><td>Ricarica la pagina (trascina giù sul telefono, o il tasto ricarica del browser).</td></tr>
<tr><td>Resta scritto "Salvataggio…"</td><td>Controlla la connessione; quando torna, la modifica si salva. Non chiudere finché non vedi "Salvato".</td></tr>
<tr><td>Non vedo un'area o un pulsante</td><td>Probabilmente il tuo ruolo non lo prevede (vedi il capitolo 2 e il manuale del tuo ruolo).</td></tr>
</table>
</section>

<section>
<h2>5. Parole dell'app</h2>
<h3>Stati di un giocatore osservato (Scouting)</h3>
<table><tr><th style="width:22%">Stato</th><th>Significato</th></tr>
<tr><td>Segnalato</td><td>Qualcuno lo ha visto e segnalato.</td></tr>
<tr><td>Da rivedere</td><td>Interessante: va visto di nuovo.</td></tr>
<tr><td>Contattato</td><td>La società ha preso contatto.</td></tr>
<tr><td>Invitato</td><td>Invitato a un open day o a un provino.</td></tr>
<tr><td>In prova</td><td>Si sta allenando con noi.</td></tr>
<tr><td>Inserito</td><td>È entrato in una nostra squadra.</td></tr></table>
<p class="small">Un giocatore non si chiude mai: resta sempre in archivio. Se non interessa più (non a livello,
ha scelto un altro progetto…), lo si scrive nelle note della scheda.</p>
<p class="small">Lo stato lo cambiano solo l'amministratore e i direttori.</p>
<h3>Categorie per anno di nascita (stagione 2026/27)</h3>
<table><tr><th>Nati nel</th><th>Categoria</th><th>Nati nel</th><th>Categoria</th></tr>
<tr><td>2008 – 2009</td><td>Juniores</td><td>2014 – 2015</td><td>Esordienti</td></tr>
<tr><td>2010</td><td>Under 17</td><td>2016 – 2017</td><td>Pulcini</td></tr>
<tr><td>2011</td><td>Under 16</td><td>2018 – 2019</td><td>Primi calci</td></tr>
<tr><td>2012</td><td>Under 15</td><td>2020 e dopo</td><td>Piccoli amici</td></tr>
<tr><td>2013</td><td>Under 14</td><td></td><td></td></tr></table>
<p class="small">La stagione cambia il 1° luglio: dal 1° luglio 2027 ogni annata sale di una categoria.</p>
<h3>Altre parole</h3>
<ul>
<li><b>Osservato / da distinta</b>: nello Scouting ci sono anche ragazzi letti dalle distinte di gara ma mai osservati
("da distinta"). Di norma sono nascosti; diventano "osservati" alla prima segnalazione.</li>
<li><b>Distinta</b>: l'elenco ufficiale dei giocatori di una partita. Serve a ricostruire squadre e partite di ogni ragazzo.</li>
<li><b>Tabellino</b>: minuti giocati, gol e cartellini di ogni giocatore in una partita.</li>
</ul>
<div class="box"><b class="t">I manuali per ruolo</b>Oltre a questo, c'è un manuale per i mister, uno per gli scout e uno per i direttori:
spiegano passo per passo le funzioni del proprio ruolo.</div>
</section>
"""

# ---------------------------------------------------------------- MISTER
mister = copertina('Manuale del mister', 'Portale squadre: preparare le partite, segnare presenze e tabellini, segnalare giocatori',
                   'i mister delle squadre dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Vedere la tua squadra: rosa, calendario, statistiche</li>
<li>Preparare le partite: dati della gara, convocazioni, formazione, calci piazzati</li>
<li>Scaricare il foglio gara e la convocazione in PDF</li>
<li>Segnare le presenze agli allenamenti e i test atletici</li>
<li>Compilare i tabellini: minuti, gol, gol subiti, cartellini</li>
<li>Aggiungere amichevoli al calendario</li>
<li>Segnalare un giocatore allo scouting</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Aggiungere o togliere giocatori dalla rosa</li>
<li>Cambiare le partite ufficiali del calendario</li>
<li>Creare o cambiare gli schemi comuni dei calci piazzati</li>
<li>Vedere le altre squadre</li>
<li>Vedere l'archivio scouting e le segnalazioni degli altri</li>
<li>Scaricare il report PDF delle statistiche (lo fa la società)</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri direttamente nella tua squadra. Se avete più mister, ognuno ha il suo PIN.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Prima di ogni partita</b>: dati della gara, convocazioni (con orario e luogo del ritrovo), formazione e panchina.
Scarica il foglio gara in PDF.</li>
<li><b>Dopo ogni allenamento</b>, lo stesso giorno: presenze, con il motivo delle assenze.</li>
<li><b>Dopo ogni partita</b>: tabellino con minuti e gol, e il risultato. Le statistiche della squadra si calcolano da qui.</li>
<li><b>Rosa</b>: se un ragazzo arriva, se ne va o ha il nome sbagliato, avvisa la società: la rosa la aggiorna l'amministratore.</li>
<li><b>Riservatezza</b>: presenze, infortuni e valutazioni dei ragazzi restano nell'app e nello staff.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Home e Squadra</h2>
{fig('p-home', '''<h3>Home</h3><ul>
<li><b>Prossima partita</b>: avversario, data, ora e luogo, con i pulsanti per prepararla e per le convocazioni.</li>
<li><b>Allenamento di oggi</b>: se le presenze non sono ancora segnate, un tocco ti porta lì.</li>
<li><b>Da fare</b>: tabellini da compilare, gol da inserire, portieri da segnare. Tocca una riga per andarci.</li>
<li><b>Stagione</b>: allenamenti, presenza media, partite, gol fatti e subiti.</li></ul>''', 'Home')}
{fig('p-rosa', '''<h3>Squadra → Rosa</h3>
<p>L'elenco dei giocatori, inserito dalla società. Il numero è quello della prossima partita, che assegni in Formazione.</p>
<p>Tocca il guanto <b>🧤</b> per segnare chi fa il portiere: servono per i gol subiti nelle statistiche.</p>
<h3>Squadra → Calendario</h3>
<p>Le partite ufficiali, inserite dalla società. Le amichevoli le aggiungi tu da <b>Statistiche → Partite → + Amichevole</b>:
compaiono anche qui.</p>''', 'Rosa')}
</section>

<section>
<h2>4. Gara: preparare la partita</h2>
<h3>Partita</h3>
<p>I dati della gara: avversario, data, ora, campo, categoria, capitano e vicecapitano, note. Se la partita è in calendario
tocca <span class="k">Usa questa</span> e i campi si compilano da soli.</p>
{fig('p-convocazioni', '''<h3>Convocazioni</h3><ol class="passi">
<li>Tocca <span class="k">Usa questa</span> per prendere la prossima partita dal calendario.</li>
<li>Controlla <b>orario e indirizzo del ritrovo</b>: si propongono da soli; il segnaposto apre Google Maps.</li>
<li>Per ogni giocatore scegli lo stato: <span class="k">CON</span> convocato, <span class="k">NC</span> non convocato,
<span class="k">INF</span> infortunato, <span class="k">SQL</span> squalificato, <span class="k">ND</span> non disponibile.</li>
<li>In fondo tocca <span class="k">Scarica convocazione PDF</span>: il foglio da mandare a ragazzi e famiglie.</li></ol>''', 'Convocazioni')}
</section>

<section>
<h2>5. Gara: la formazione</h2>
{duo('p-formazione-campo', 'Il campo: modulo, posizioni, × per togliere', 'p-formazione-elenco', 'Tocchi una posizione: scegli chi metterci')}
<ol class="passi">
<li>Scegli il <b>modulo</b> (per esempio 1-4-2-3-1).</li>
<li><b>Tocca una posizione sul campo</b>: si apre l'elenco dei giocatori; tocca chi vuoi mettere lì.
Se la posizione è occupata puoi anche <span class="k">Togli dal campo</span>.</li>
<li>In alternativa: tocca un giocatore per metterlo nella <b>prossima posizione libera</b>, oppure <b>trascinalo</b> su una
posizione (vicino al bordo dello schermo la pagina scorre da sola).</li>
<li>La <span class="k">×</span> rossa su una posizione toglie il giocatore dal campo.</li>
<li>Sotto, in <b>Panchina</b>, tocca i giocatori che vanno in panchina.</li>
<li>Trascinando la casella di una posizione la sposti leggermente sul campo; <span class="k">Ripristina posizioni modulo</span> la rimette a posto.</li></ol>
<p class="small">Il numero grande è quello della partita; il numerino in alto è il ruolo usato negli schemi dei calci piazzati.</p>
</section>

<section>
<h2>6. Piazzati e foglio gara</h2>
{fig('p-piazzati', '''<h3>Piazzati</h3>
<p>Gli schemi (angoli e punizioni, a favore e a sfavore) sono <b>comuni a tutte le squadre</b> e li carica la società.</p><ul>
<li>Tocca uno schema per <b>selezionarlo</b> per questa partita.</li>
<li>Assegna compiti e giocatori: si riempiono anche da soli dalla formazione, in base al numero di ruolo.</li>
<li>Puoi spostare le pedine o disegnare frecce <b>solo per la tua partita</b>: lo schema per gli altri non cambia.</li></ul>''', 'Piazzati')}
{fig('p-pdf', '''<h3>Foglio gara PDF</h3>
<p>Anteprima e <span class="k">Scarica PDF</span>: prima pagina con distinta e formazione, poi una pagina per ogni schema selezionato.
La <b>convocazione</b> si scarica invece dalla scheda Convocazioni.</p>
<p>Se hai cambiato qualcosa, tocca <span class="k">Aggiorna anteprima</span>.</p>''', 'Foglio gara PDF')}
</section>

<section>
<h2>7. Allenamento</h2>
{fig('p-presenze', '''<h3>Presenze</h3><ol class="passi">
<li>Tocca <span class="k">+ Allenamento di oggi</span> (o apri un'altra data).</li>
<li>Per ogni ragazzo: <span class="k">Presente</span> o <span class="k">Assente</span>; se assente, scegli il <b>motivo</b>
(malattia, infortunio, scuola / studio, motivi familiari, ingiustificata). <span class="k">Tutti presenti</span> li segna tutti in un colpo.</li>
<li>Se serve, una nota sulla seduta (solo tecnica).</li></ol>
<p>Gli infortuni non abbassano la percentuale di presenza del ragazzo.</p>
<h3>Test atletici</h3>
<p><span class="k">+ Nuovo test</span>, poi i tempi di ognuno come <b>minuti:secondi</b> (es. 12:51). Una parola diversa
(es. "non svolto") resta come nota.</p>''', 'Presenze')}
</section>

<section>
<h2>8. Statistiche e tabellini</h2>
{fig('p-statistiche', '''<h3>Statistiche → Allenamento</h3>
<p>Percentuali di presenza per giocatore e per mese, risultati dei test. In rosso chi è sotto il 75%.</p>
<h3>Statistiche → Partite</h3>
<p>Partite giocate, gol fatti e subiti, marcatori, e per ogni giocatore presenze e minuti.</p>
<h3>Tabellini</h3><ol class="passi">
<li>Nella tabella dei tabellini tocca una partita.</li>
<li>Segna chi ha giocato, i <b>minuti</b>, i <b>gol</b>, i cartellini, e i <b>gol subiti</b> dei portieri.</li>
<li>Inserisci il risultato.</li></ol>
<p><span class="k">+ Amichevole</span> aggiunge un'amichevole: finisce anche nel calendario.</p>''', 'Statistiche → Partite')}
</section>

<section>
<h2>9. Scouting: segnalare un giocatore</h2>
{fig('p-segnala', '''<p>Hai visto un ragazzo interessante (in una partita contro di voi, a un torneo…)? Mandalo allo scouting del club
dall'area <b>Scouting</b>.</p><ol class="passi">
<li><b>Annata</b> (obbligatoria) e, se lo sai, il ruolo.</li>
<li><b>Società</b>: scegli dall'elenco o scrivila.</li>
<li><b>Cognome e nome</b>, oppure, se non li sai, <b>come riconoscerlo</b> ("N.8, biondo, mancino").</li>
<li><b>Cosa hai visto</b>: la parte più importante, solo aspetti tecnici e sportivi.</li>
<li>Prima impressione da 1 a 5, partita o occasione, data. Poi <span class="k">Invia allo scouting</span>.</li></ol>
<p>La segnalazione arriva firmata con il tuo nome e la tua squadra. Non vedi l'archivio scouting: se il ragazzo c'è già,
la tua segnalazione si aggiunge alla sua scheda.</p>''', 'Segnala un giocatore')}
</section>
"""

# ---------------------------------------------------------------- SCOUT
scout = copertina('Manuale dello scout', 'Scouting: segnalare, valutare, seguire i giocatori e le gare da vedere',
                  'gli scout dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Segnalare un giocatore, anche senza sapere il nome</li>
<li>Valutarlo su 4 aree (Tecnica, Motoria, Tattica, Mentale)</li>
<li>Registrare open day, provini e allenamenti di prova, con presenza ed esito</li>
<li>Consultare l'archivio, le schede, lo storico delle squadre e le prossime gare di ogni ragazzo</li>
<li>Scegliere le gare da vedere con "Ci vado io"</li>
<li>Aggiungere i contatti della famiglia (con il consenso)</li>
<li>Modificare i dati dei giocatori che hai segnalato tu</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Cambiare lo stato di un giocatore (segnalato, contattato…)</li>
<li>Inserire o modificare le gare e le squadre da seguire</li>
<li>Vedere i contatti inseriti da altri</li>
<li>Unire schede doppie</li>
<li>Entrare nel Portale squadre</li>
<li>Vedere i PIN</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri nello Scouting. Le schede in alto sono: <b>Home</b>, <b>Giocatori</b>, <b>Gare</b>, <b>Segnala</b>, <b>Profilo</b>.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Segnalazioni fedeli</b>: scrivi quello che hai visto, con aspetti tecnici e sportivi. Niente giudizi offensivi,
niente informazioni personali (salute, famiglia, scuola).</li>
<li><b>Segnala subito</b>, lo stesso giorno: il ricordo è fresco e il resto del team lo sa.</li>
<li><b>Niente doppioni</b>: prima di segnalare cerca il ragazzo in <b>Giocatori</b>; se c'è, usa
<span class="k">Aggiungi segnalazione</span> dalla sua scheda. L'app riconosce comunque stesso cognome, nome e annata.</li>
<li><b>"Ci vado io"</b>: usalo per le gare a cui vai, così non si va in due allo stesso campo, e toglilo se cambi idea.</li>
<li><b>Contatti delle famiglie</b>: li inserisci solo se la famiglia ha dato il consenso. Per contattare società, famiglie o
ragazzi segui le indicazioni del direttore e della società.</li>
<li><b>Discrezione</b> a bordo campo e fuori: le valutazioni restano nello staff.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Segnalare un giocatore</h2>
{fig('s-segnala', '''<p>Dalla scheda <b>Segnala</b> (o dal riquadro blu in Home):</p><ol class="passi">
<li><b>Annata</b> (obbligatoria) e ruolo, se lo sai.</li>
<li><b>Società</b>: scegli dall'elenco mentre scrivi; se è nuova, la aggiungo io.</li>
<li><b>Cognome e nome</b>. Se non li sai, compila <b>Come riconoscerlo</b> ("N.8, biondo, mancino"): si completa dopo.</li>
<li><b>Cosa hai visto</b>: il cuore della segnalazione.</li>
<li><b>Prima impressione</b> da 1 (non a livello) a 5 (da prendere subito), partita o occasione, data.</li>
<li><span class="k">Salva segnalazione</span>: si apre la scheda del giocatore.</li></ol>
<p class="small">Stesso cognome, nome e annata di un ragazzo già in archivio? La segnalazione si aggiunge alla sua scheda.</p>''', 'Segnala un giocatore')}
</section>

<section>
<h2>4. La scheda del giocatore</h2>
{fig('s-scheda', '''<ul>
<li><b>In alto</b>: nome, stato, annata, ruolo, piede, società e <b>squadra</b> (società · categoria, es. "Under 14 - 2013").
<span class="k">Aggiungi segnalazione</span> e <span class="k">Valuta</span>.</li>
<li><b>Valutazioni</b>: le medie delle 4 aree.</li>
<li><b>Prossime gare</b>: le partite della sua squadra caricate in Gare, con ora, campo e mappa, e "Ci vado io".</li>
<li><b>Squadre e partite</b>: lo storico dalle distinte. Il <b>percorso</b> tra le società e, per ogni stagione, squadra,
categoria, partite, numero di maglia.</li>
<li><b>Eventi</b>: open day, provini, allenamenti di prova.</li>
<li><b>Storia</b>: tutte le segnalazioni, valutazioni e cambi di stato, con autore e data.</li>
<li><b>Contatti</b> (vedi i tuoi) e <b>Modifica dati</b> (solo per i giocatori che hai segnalato tu).</li></ul>''', 'Scheda del giocatore')}
</section>

<section>
<h2>5. Valutare ed eventi</h2>
{fig('s-valuta', '''<h3>Valutazione</h3><ol class="passi">
<li>Dalla scheda tocca <span class="k">Valuta</span>.</li>
<li>Per ogni area un voto da <b>1 a 5</b> e, se vuoi, una nota: <b>Tecnica</b> (conduzione, passaggio, tiro, primo controllo),
<b>Motoria</b> (rapidità, coordinazione, equilibrio, resistenza), <b>Tattica</b> (posizione, scelte, lettura del gioco),
<b>Mentale</b> (atteggiamento, reazione all'errore, personalità).</li>
<li><b>Giudizio finale</b>: da prendere, da rivedere, non a livello; un commento, la partita, la data.</li>
<li><span class="k">Salva valutazione</span>.</li></ol>
<h3>Eventi</h3>
<p>Nella scheda, sezione <b>Eventi</b> → <span class="k">Aggiungi evento</span>: tipo (open day, provino, allenamento di prova,
altro), data, presenza, esito, note. Dopo l'evento aggiorna presenza ed esito con <b>Aggiorna presenza ed esito</b>.</p>''', 'Valutazione a 4 aree')}
</section>

<section>
<h2>6. Gare da vedere</h2>
{fig('s-gare', '''<ul>
<li>Le gare dei prossimi giorni, dalla più vicina, con la <b>distanza</b> da Casatenovo o Merate.</li>
<li><b>Filtri</b>: sede, entro quanti km, periodo, "Seguite o con giocatori segnalati" oppure "Tutte le gare", categoria.</li>
<li>Le gare vengono dai <b>calendari ufficiali</b> dei gironi. <b>Da calendario</b> = data, ora e campo previsti, ancora da
verificare; <b>Confermata · C.U. n. …</b> = confermata dal comunicato ufficiale; <b>Variata · C.U. n. …</b> = data, ora o campo
cambiati dal comunicato. Controlla sempre prima di partire.</li>
<li>Sotto ogni partita i <b>giocatori segnalati</b> che giocano in quelle squadre: tocca il nome per la scheda.</li>
<li>Bordo giallo = gara interessante <b>senza nessun osservatore</b>.</li>
<li><span class="k">Ci vado io</span> ti segna sulla gara; <span class="k">Non ci vado più</span> ti toglie.
Le tue gare le ritrovi in Home, in <b>Le mie gare</b>.</li></ul>''', 'Gare da vedere')}
<h2 style="margin-top:6mm">7. Archivio giocatori</h2>
<ul>
<li><b>Giocatori</b>: cerca per nome o descrizione, filtra per annata, ruolo, stato, società.
Di norma vedi i ragazzi <b>osservati</b>; con "Anche solo da distinta" vedi anche quelli letti dalle distinte e mai osservati.</li>
<li><b>Per stato</b>: le colonne Segnalato → Da rivedere → … → Inserito. Utile per vedere la pipeline.</li>
<li><b>Profilo</b>: il tuo nome e il ruolo. Il PIN, se lo perdi, lo rigenera l'amministratore.</li>
</ul>
</section>
"""

# ---------------------------------------------------------------- DIRETTORI
direttori = copertina('Manuale del direttore', 'Squadre in lettura, Società e Scouting completi.',
                      'i direttori dell’Academy') + f"""
<section>
<h2>1. In breve</h2>
<div class="box blu"><b class="t">Squadre in lettura, Società e Scouting completi</b>
Nelle squadre controlli: vedi rose, partite, presenze e statistiche di tutte, ma le modifiche le fanno i mister e
l'amministratore. In <b>Società</b> e nello <b>Scouting</b> invece lavori come l'amministratore: squadre, mister,
scout, direttori e PIN; segnalazioni, valutazioni, stati, gare e schede doppie. Vedi anche i contatti delle famiglie.</div>
<div class="si">
<div class="col"><h3>Puoi</h3><ul class="ok">
<li>Aprire il Portale di <b>tutte le squadre</b>: rosa, calendario, convocazioni, formazioni, presenze, statistiche</li>
<li>In <b>Società</b>: creare e togliere squadre, aggiungere mister, scout e direttori, generare e rigenerare i PIN</li>
<li>Vedere l'app <b>come la vede un mister</b> (Anteprima)</li>
<li>Nello <b>Scouting</b>: segnalare, valutare, cambiare gli stati, gestire gare e squadre seguite,
unire le schede doppie, segnarti su una gara ("Ci vado io")</li></ul></div>
<div class="col"><h3>Non puoi</h3><ul class="ko">
<li>Modificare rose, calendari, partite, convocazioni, formazioni, presenze, test e schemi delle squadre</li></ul></div>
</div>
{ACCESSO}
<p>Con il tuo PIN entri nel <b>Portale</b>; lo Scouting è l'area <b>Scouting</b> nella barra in alto.
Nelle schede delle squadre i campi si leggono ma non si scrivono (in alto: DIRETTORE · SOLA LETTURA);
in Società e nello Scouting hai gli stessi pulsanti dell'amministratore.</p>
</section>

<section>
<h2>2. Le tue responsabilità</h2>
<ul>
<li><b>Riservatezza massima</b>: vedi i PIN di tutti e i contatti delle famiglie. Non si comunicano a nessuno,
se non alla persona interessata, quando la aggiungi o le rigeneri il PIN.</li>
<li><b>Controllo</b>: verifica che le squadre tengano aggiornati convocazioni, presenze e tabellini, e che lo scouting segnali
e valuti con regolarità e qualità.</li>
<li><b>Decisioni</b>: le decisioni sui giocatori osservati (contattare, invitare, inserire, chiudere) le registri tu
nello Scouting, cambiando lo stato; quelle sulle squadre comunicale all'amministratore.</li>
<li><b>Sicurezza</b>: se sospetti che un PIN sia finito in mani sbagliate, avvisa subito l'amministratore.</li>
</ul>
{REGOLE}
</section>

<section>
<h2>3. Il Portale delle squadre</h2>
{fig('p-home', '''<ol class="passi">
<li>In alto, accanto a <b>Squadra</b>, scegli la squadra dal menu.</li>
<li>Usa le aree come un mister: <b>Home</b> (prossima partita, da fare, stagione), <b>Squadra</b> (rosa, calendario),
<b>Gara</b> (partita, convocazioni, formazione, piazzati, PDF), <b>Allenamento</b> (presenze, test),
<b>Statistiche</b> (allenamento e partite).</li>
<li>La sezione <b>Da fare</b> in Home mostra cosa manca: tabellini da compilare, gol da inserire.</li></ol>
<p><b>Anteprima</b>: con "Guarda l'app come" vedi esattamente cosa vede il mister di una squadra.</p>''', 'La Home di una squadra')}
<h3>Società</h3>
<p>Le schede delle <b>squadre</b> con i loro mister, poi <b>Scouting</b> (gli scout) e <b>Direttori</b>, ognuno con il suo PIN.
Puoi aggiungere o togliere squadre e persone, cambiare i nomi, generare, rigenerare o disattivare i PIN e sospendere un account.</p>
</section>

<section>
<h2>4. Lo Scouting</h2>
{fig('s-scheda', '''<ul>
<li><b>Giocatori</b>: archivio con ricerca e filtri; "Anche solo da distinta" mostra anche i ragazzi letti dalle distinte.
<b>Per stato</b> mostra la pipeline a colonne.</li>
<li><b>Scheda</b>: squadra e categoria, prossime gare, medie delle valutazioni, storico squadre e partite (con il percorso tra
le società), eventi, storia completa, <b>contatti della famiglia</b>.</li>
<li><b>Gare</b>: le gare da vedere con i giocatori segnalati di ogni partita e chi ci va.</li>
<li><b>Home</b>: numeri dell'archivio per stato e ultime segnalazioni.</li>
<li>Come l'amministratore puoi <b>segnalare</b>, <b>valutare</b>, <b>cambiare lo stato</b> (anche trascinando nella vista
Per stato), <b>gestire le gare</b> e unire le <b>schede doppie</b>.</li></ul>''', 'Scheda di un giocatore')}
<div class="box"><b class="t">Glossario e regole</b>Stati dei giocatori, categorie per anno di nascita e regole sui dati sono nel
<b>Manuale generale</b>.</div>
</section>
"""

MANUALI = {
    'Manuale_generale': ('Manuale generale', generale),
    'Manuale_mister': ('Manuale del mister', mister),
    'Manuale_scout': ('Manuale dello scout', scout),
    'Manuale_direttori': ('Manuale del direttore', direttori),
}
for file, (titolo, corpo) in MANUALI.items():
    (QUI / f'{file}.html').write_text(pagina(titolo, corpo), encoding='utf-8')
print('HTML scritti:', ', '.join(MANUALI))
