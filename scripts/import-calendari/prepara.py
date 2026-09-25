"""Prepara l'importazione dei calendari: legge i PDF elencati, abbina ogni nome del calendario
alla sua riga dell'elenco campi (stesso girone) e calcola data, ora e campo di ogni partita.

Uso: python3 scripts/import-calendari/prepara.py [cartella] [anno-inizio-stagione]
  cartella (di norma private/calendari/, esclusa da git): i PDF dei calendari, messi a mano, più
  categorie.tsv con una riga per PDF → nome-file<TAB>categoria   (es. "U17Elite.pdf<TAB>Under 17 Élite").
  Un PDF nuovo non ancora in categorie.tsv viene aggiunto con una categoria indovinata: controllala.
Scrive scripts/import-calendari/dati/calendari.json, letto poi da importa.mjs. Richiede pdfplumber.

Regole:
- il giorno scritto nell'elenco campi (sabato/domenica) sposta la data nello stesso fine settimana;
- l'ora è quella del campo della squadra di casa; senza ora (o nei turni infrasettimanali) → da definire;
- un nome scritto diversamente in poche giornate ("SESTESE" / "SESTESE CALCIO") è la stessa squadra."""
import datetime as dt
import difflib
import json
import os
import re
import sys
import unicodedata
from collections import Counter

sys.path.insert(0, os.path.dirname(__file__))
from leggi_pdf import leggi  # noqa: E402

# Forme societarie e sigle che non distinguono una società dall'altra
FORME = (r'\b(A\.?S\.?D\.?|S\.?S\.?D\.?|S\.?R\.?L\.?|A\.?\s?R\.?\s?L\.?|SSDARL|SSDSRL|SSDRL|SCARL|S\.C\.A\.R\.L\.|'
         r'U\.?S\.?D\.?|A\.?C\.?D\.?|G\.?S\.?D\.?|S\.?S\.?|U\.?S\.?|A\.?S\.?|POL\.?D\.?|SQ\.?\s?[A-C]|SQ[A-C])\b')
# Abbreviazioni dei calendari
ABBR = [(r'\bACC\.\s*|\bAC\.\s*', ' ACCADEMIA '), (r'\bC\.\s*', ' CALCIO '), (r'\bS\.\s*', ' SAN '),
        (r'\bORAT\.\s*|\bOR\.\s*', ' ORATORIO '), (r'\bPOL\.\s*', ' POLISPORTIVA '),
        (r'\bF\.\s*C\.\s*', ' FOOTBALL CLUB '), (r'\bACCADEMY\b|\bACADEMY\b', ' ACCADEMIA '), (r'\bGIOV\.\s*', ' GIOVANILE ')]
# Nel nome da mostrare si tolgono solo le forme societarie
FORME_NOME = (r'\b(A\.S\.D\.|ASD|S\.S\.D\.?|SSD|S\.R\.L\.|SRL|A\s?R\.?L\.?|ARL|SSDARL|SSDSRL|SCARL|S\.C\.A\.R\.L\.|'
              r'U\.S\.D\.|USD|G\.S\.D\.|POL\.D\.|A\.S\.|U\.S\.|S\.S\.|SSD\s?A\s?RL|\*FCL\*|SQ\.?\s?[A-C])(?=\s|$)')
# Stessa società che i calendari scrivono in modi che le regole non riconoscono
UNIONI = {'ATALANTABERGAMASCACALCIO': 'ATALANTABERGAMASCA'}
SIGLE = {'AC', 'ACD', 'GSO', 'ASR', 'CSC', 'OSL', 'FBC', 'GS', 'US', 'SC', 'CG', 'BMV', 'OSGB'}
MINUSCOLE = {'DI', 'DEL', 'DELLA', 'E', 'IN', 'SUL', 'SULL', 'DE'}


def maiuscolo(s):
    return unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().upper()


def pulito(s):
    """Chiave di confronto: senza forme societarie, abbreviazioni sciolte, solo lettere e cifre"""
    t = re.sub(r'S\s?Q\.?\s?[A-C]\b|\*FCL\*', ' ', maiuscolo(s))   # "BREMBSQ.B": squadra B attaccata al nome
    t = re.sub(FORME, ' ', t)   # prima le forme societarie, se no "A.S.D." diventerebbe "A SAN D"
    for a, b in ABBR:
        t = re.sub(a, b, t)
    t = re.sub(FORME, ' ', t)
    return re.sub(r'[^A-Z0-9]', '', t)


def squadra_b(s):
    m = re.search(r'S\s?Q\.?\s?([BC])\b|sq\.?([BC])\b', s, re.I)
    return (m.group(1) or m.group(2)).upper() if m else ''


def nome_bello(ufficiale):
    """"U.S.D. CASATESE MERATE A.S.D." → "Casatese Merate" """
    t = re.sub(r'\s+', ' ', re.sub(r'S\s?Q\.?\s?[A-C]\b', ' ', ufficiale.replace('*FCL*', ' '), flags=re.I))
    t = re.sub(r'(\d)(SRL|SSD)\b', r'\1', t)   # "1919SRL"
    for _ in range(3):
        t = re.sub(FORME_NOME, ' ', t + ' ').strip()
        t = re.sub(r'^(U\.S\.D\.|A\.S\.D\.|G\.S\.D\.|S\.S\.D\.)\s*', '', t)
    parole = []
    for i, p in enumerate(t.split()):
        if re.fullmatch(r'([A-Z]\.)+[A-Z]?\.?', p) or re.search(r'\d', p) or p.upper() in SIGLE or re.fullmatch(r'[IVX]{2,}', p.upper()):   # A.C., 2B, GSO
            parole.append(p.upper())
        elif i > 0 and p.upper() in MINUSCOLE:
            parole.append(p.lower())
        else:
            parole.append(re.sub(r"(^|[.'])([a-z])", lambda m: m.group(1) + m.group(2).upper(), p.lower()))
    return ' '.join(parole) or ufficiale


def punteggio(a, b):
    if squadra_b(a) != squadra_b(b):
        return 0
    x, y = pulito(a), pulito(b)
    if x == y:
        return 3
    if len(x) >= 4 and (x in y or y in x):
        return 2 + min(len(x), len(y)) / max(len(x), len(y))
    return difflib.SequenceMatcher(None, x, y).ratio() * 2


def abbina_girone(partite, campi):
    """nome nel calendario → indice della riga nell'elenco campi (uno a uno, i più simili prima)"""
    c = Counter(t for p in partite for t in (p['casa'], p['trasferta']))
    top = max(c.values())
    principali = [n for n in c if c[n] >= top / 2]
    varianti = [n for n in c if c[n] < top / 2]
    coppie = sorted(((punteggio(n, k['societa']), n, i) for n in principali for i, k in enumerate(campi)), reverse=True)
    mappa, usati = {}, set()
    for s, n, i in coppie:
        if n in mappa or i in usati:
            continue
        mappa[n] = (i, s)
        usati.add(i)
    for v in varianti:
        best = max(principali, key=lambda n: punteggio(v, n))
        mappa[v] = (mappa.get(best, (None, 0))[0], -1)
    return mappa


def giorno_partita(elencata, giorno):
    d = dt.date.fromisoformat(elencata)
    if d.weekday() == 6 and giorno == 'sabato':
        return d - dt.timedelta(days=1)
    if d.weekday() == 5 and giorno == 'domenica':
        return d + dt.timedelta(days=1)
    return d


def unisci_societa(partite):
    """Stessa società scritta in modo diverso da un calendario all'altro ("C.S.C. COSTAMASNAGA" /
    "COSTAMASNAGA"): si uniscono se un nome contiene l'altro E giocano sullo stesso campo.
    Omonimi su campi diversi ("GSO SAN GIORGIO" di Casatenovo, "SAN GIORGIO" di Molteno) restano separati.
    Poi ogni società prende il nome più completo."""
    campi, nomi = {}, {}
    for p in partite:
        for lato in ('casa', 'trasferta'):
            s = p[lato]
            nomi.setdefault(s['chiave'], Counter())[s['nome']] += 1
        if p['codice_campo']:
            campi.setdefault(p['casa']['chiave'], set()).add(p['codice_campo'])
    chiavi = sorted(nomi, key=len)
    dove = {k: UNIONI.get(k, k) for k in chiavi}
    for i, a in enumerate(chiavi):
        for b in chiavi[i + 1:]:
            if len(a) >= 5 and a in b and campi.get(a, set()) & campi.get(b, set()):
                dove[b] = dove[a]
                print(f'  = {max(nomi[b], key=nomi[b].get)} → {max(nomi[a], key=nomi[a].get)}')
    finale = {}
    for k, n in nomi.items():
        finale.setdefault(dove[k], Counter()).update(n)
    for p in partite:
        for lato in ('casa', 'trasferta'):
            s = p[lato]
            s['chiave'] = dove[s['chiave']]
            s['nome'] = max(finale[s['chiave']], key=len)   # il più completo ("Oriens Oratorio Brembate")


def indovina_categoria(percorso):
    """Solo un aiuto per i PDF nuovi: età dal testo, livello dalle parole chiave"""
    import pdfplumber
    with pdfplumber.open(percorso) as pdf:
        t = maiuscolo(' '.join((p.extract_text() or '') for p in pdf.pages[:1]) + ' ' + os.path.basename(percorso))
    eta = re.search(r'(?<![A-Z])(?:UNDER|U)\s?\.?\s?(1[4-9])(?!\d)', t)
    eta = '19' if 'JUNIORES' in t else eta.group(1) if eta else '?'
    nome = f'Under {eta}' + (' Juniores' if eta == '19' else '')
    nome_file = maiuscolo(os.path.basename(percorso))
    citta = next((c.title() for c in ('BERGAMO', 'MONZA', 'LECCO', 'SONDRIO', 'COMO', 'VARESE', 'MILANO')
                  if c in nome_file), None) or ('Bergamo' if re.search(r'\bBG\b', nome_file) else None)
    if 'ELITE' in t:
        return f'{nome} Élite'
    if citta:
        return f'{nome} Provinciali {citta}'
    if 'REG' in nome_file or ('REGIONAL' in t and 'PROVINCIAL' not in t):
        return f'{nome} Regionali'
    return f'{nome} Provinciali ?'


def elenco_pdf(cartella):
    """(percorso, categoria) per ogni PDF della cartella; i nuovi finiscono in categorie.tsv"""
    tsv = os.path.join(cartella, 'categorie.tsv')
    note = {}
    if os.path.exists(tsv):
        for riga in open(tsv, encoding='utf-8'):
            if riga.strip() and not riga.startswith('#'):
                nome, cat = [x.strip() for x in riga.split('\t')[:2]]
                note[nome] = cat
    nuovi = []
    for nome in sorted(os.listdir(cartella)):
        if nome.lower().endswith('.pdf') and nome not in note:
            note[nome] = indovina_categoria(os.path.join(cartella, nome))
            nuovi.append(nome)
    if nuovi:
        with open(tsv, 'a', encoding='utf-8') as f:
            for nome in nuovi:
                f.write(f'{nome}\t{note[nome]}\n')
                print(f'  + nuovo: {nome} → "{note[nome]}" (controlla la categoria in categorie.tsv)')
    return [(os.path.join(cartella, n), c) for n, c in note.items() if os.path.exists(os.path.join(cartella, n))]


def main():
    radice = os.path.join(os.path.dirname(__file__), '..', '..')
    cartella = sys.argv[1] if len(sys.argv) > 1 else os.path.join(radice, 'private', 'calendari')
    anno = int(sys.argv[2]) if len(sys.argv) > 2 else 2026
    stagione = f'{anno}/{str(anno + 1)[2:]}'
    partite, dubbi = [], []
    for percorso, categoria in elenco_pdf(cartella):
        if '?' in categoria:
            dubbi.append(f'{os.path.basename(percorso)}: categoria da completare in categorie.tsv, saltato')
            continue
        d = leggi(percorso, categoria, anno)
        for g, v in sorted(d['gironi'].items()):
            campi = v['campi']
            if not campi:
                dubbi.append(f'{categoria} {g}: elenco campi mancante')
                continue
            mappa = abbina_girone(v['partite'], campi)
            for n, (i, s) in mappa.items():
                if i is None or 0 <= s < 1.2:
                    dubbi.append(f'{categoria} {g}: "{n}" → {campi[i]["societa"] if i is not None else "?"}')

            def squadra(n):
                i = mappa[n][0]
                uff = campi[i]['societa'] if i is not None else n
                b = squadra_b(n) or squadra_b(uff)
                return {'calendario': n, 'ufficiale': uff, 'chiave': pulito(uff), 'nome': nome_bello(uff),
                        'squadra': b, 'riga': campi[i] if i is not None else None}

            for p in v['partite']:
                casa, trasf = squadra(p['casa']), squadra(p['trasferta'])
                for turno in ('andata', 'ritorno'):
                    if not p[turno]:
                        continue
                    # al ritorno si invertono casa e trasferta
                    h, a = (casa, trasf) if turno == 'andata' else (trasf, casa)
                    campo = h['riga'] or {}
                    elencata = dt.date.fromisoformat(p[turno])
                    infrasettimanale = elencata.weekday() < 5
                    ora = campo.get('ora') if campo.get('ora') and re.match(r'^\d{1,2}[:.]\d{2}$', campo.get('ora')) else None
                    partite.append({
                        'stagione': stagione, 'categoria': categoria, 'girone': g, 'giornata': p['giornata'],
                        'turno': turno, 'data_calendario': p[turno],
                        'data': giorno_partita(p[turno], campo.get('giorno')).isoformat(),
                        'ora': None if infrasettimanale else (ora.replace('.', ':') if ora else None),
                        'casa': {k: h[k] for k in ('calendario', 'ufficiale', 'chiave', 'nome', 'squadra')},
                        'trasferta': {k: a[k] for k in ('calendario', 'ufficiale', 'chiave', 'nome', 'squadra')},
                        'campo': campo.get('campo'), 'indirizzo': campo.get('indirizzo'), 'codice_campo': campo.get('codice'),
                        'fonte': f'Calendario {categoria} girone {g} ({os.path.basename(percorso)})',
                    })
    unisci_societa(partite)
    uscita = os.path.join(os.path.dirname(__file__), 'dati', 'calendari.json')
    os.makedirs(os.path.dirname(uscita), exist_ok=True)
    json.dump(partite, open(uscita, 'w', encoding='utf-8'), ensure_ascii=False)
    print(f'{len(partite)} partite → {uscita}')
    for x in dubbi:
        print('  ? ' + x)


if __name__ == '__main__':
    main()
