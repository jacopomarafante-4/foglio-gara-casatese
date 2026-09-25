"""Legge i calendari ufficiali in PDF (LND Lombardia grafici, delegazioni a tabella di testo)
e produce JSON con partite e campi di gioco.

Uso: python3 scripts/import-calendari/leggi_pdf.py FILE.pdf "Categoria" [prefisso-girone]
Richiede pdfplumber (pip install pdfplumber). Le partite si separano per POSIZIONE del trattino
tra casa e trasferta (sta sempre alla stessa x in ogni colonna), non per testo: così funzionano
anche nomi che contengono un trattino ("SPORTING OVZ - ASD")."""
import json, re, sys
from collections import Counter
import pdfplumber

DATA = re.compile(r'^(\d{1,2})/(\d{2})/(\d{2}|\d{4})$')


def righe(words, tol=2.5):
    out = []
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        if out and abs(out[-1][0] - w['top']) <= tol:
            out[-1][1].append(w)
        else:
            out.append([w['top'], [w]])
    return [(t, sorted(ws, key=lambda w: w['x0'])) for t, ws in out]


def data_iso(s, stagione_inizio):
    d, m, y = DATA.match(s).groups()
    d, m = int(d), int(m)
    # l'anno scritto a volte è sbagliato (es. 2027 invece di 2026): conta la stagione
    anno = stagione_inizio if m >= 7 else stagione_inizio + 1
    return f'{anno}-{m:02d}-{d:02d}'


def testo(ws):
    return ' '.join(w['text'] for w in ws).strip()


def leggi_calendario(page, stagione_inizio):
    words = [w for w in page.extract_words(x_tolerance=2) if w['text'] not in ('|',)]
    rs = righe(words)
    # intestazioni delle giornate
    heads = []
    for t, ws in rs:
        for i, w in enumerate(ws):
            nxt = ws[i + 1]['text'] if i + 1 < len(ws) else ''
            if w['text'].upper() == 'GIORNATA' and nxt.isdigit():
                heads.append({'n': int(nxt), 'x': (w['x0'] + ws[i + 1]['x1']) / 2, 'top': t})
            elif w['text'].isdigit() and nxt == 'G' and i + 2 < len(ws) and ws[i + 2]['text'] == 'I':
                heads.append({'n': int(w['text']), 'x': w['x0'], 'top': t})
    # colonne = posizioni ricorrenti dei trattini
    dashes = [w for w in words if w['text'] in ('-', '–')]
    xs = sorted(w['x0'] for w in dashes)
    gruppi = []
    for x in xs:
        if gruppi and x - gruppi[-1][-1] <= 12: gruppi[-1].append(x)
        else: gruppi.append([x])
    cols = [sum(g) / len(g) for g in gruppi if len(g) >= 4]
    if not cols or not heads: return []
    bounds = [(cols[i - 1] + cols[i]) / 2 if i else 0 for i in range(len(cols))] + [page.width]
    col_of = lambda x: max(i for i in range(len(cols)) if bounds[i] <= x)
    for h in heads:
        h['col'] = col_of(h['x']); h['a'] = h['r'] = None
    # date di andata e ritorno: all'intestazione più vicina della stessa colonna
    # (LND: date sotto "GIORNATA n"; delegazioni: sopra, nella riga ANDATA/RITORNO)
    for t, ws in rs:
        for i, w in enumerate(ws[:-1]):
            k = w['text'].upper().rstrip(':').rstrip('.')
            if k in ('A', 'R', 'ANDATA', 'RITORNO') and DATA.match(ws[i + 1]['text']):
                c = col_of(w['x0'])
                cand = [h for h in heads if h['col'] == c and -15 <= h['top'] - t <= 40 or (h['col'] == c and -40 <= h['top'] - t <= 0)]
                if not cand: continue
                h = min(cand, key=lambda h: abs(h['top'] - t))
                h['a' if k in ('A', 'ANDATA') else 'r'] = data_iso(ws[i + 1]['text'], stagione_inizio)
    partite = []
    # ogni trattino di separazione: casa = parole a sinistra, trasferta = a destra, stessa altezza
    for sep in dashes:
        ci = min(range(len(cols)), key=lambda i: abs(cols[i] - sep['x0']))
        if abs(cols[ci] - sep['x0']) > 10: continue
        sx, t = sep['x0'], sep['top']
        lo, hi = bounds[ci], bounds[ci + 1]
        riga = [w for w in words if abs(w['top'] - t) <= 3 and w is not sep]
        casa = testo(sorted([w for w in riga if lo <= w['x0'] < sx], key=lambda w: w['x0']))
        fuori = testo(sorted([w for w in riga if sx < w['x0'] < hi], key=lambda w: w['x0']))
        if not casa or not fuori or casa.upper().startswith('RIPOS') or fuori.upper().startswith('RIPOS'): continue
        cand = [h for h in heads if h['col'] == ci and h['top'] < t]
        if not cand: continue
        h = max(cand, key=lambda h: h['top'])
        partite.append({'giornata': h['n'], 'andata': h['a'], 'ritorno': h['r'], 'casa': casa, 'trasferta': fuori})
    return partite


def girone_di(page):
    t = page.extract_text() or ''
    m = re.search(r'GIRONE[:\s]+([A-Z])\b', t, re.I)
    return m.group(1).upper() if m else None


def leggi_campi(page):
    """Elenco campi: nome società, codice campo, campo, indirizzo, ora, giorno."""
    out = []
    t = page.extract_text() or ''
    if '|' in t:  # delegazioni: tabella di testo
        for l in t.splitlines():
            p = [x.strip() for x in l.split('|')]
            if len(p) >= 6 and p[2].isdigit():
                ora = p[4] if re.match(r'\d{1,2}:\d{2}', p[4]) else None
                giorno = 'sabato' if 'SABATO' in l.upper() else ('domenica' if 'DOMENICA' in l.upper() else None)
                out.append({'societa': p[1], 'codice': p[2], 'campo': p[3], 'ora': ora, 'indirizzo': p[5], 'giorno': giorno})
        return out
    for tab in page.extract_tables():
        head = ' '.join((c or '') for c in tab[0]).upper()
        if 'SOCIET' not in head: continue
        # celle riconosciute dal contenuto: le colonne non sono sempre allineate alle intestazioni
        for r in tab[1:]:
            celle = [(c or '').replace('\n', ' ').strip() for c in r]
            celle = [c for c in celle if c]
            if len(celle) < 3: continue
            cod = next((c for c in celle[1:3] if c.isdigit()), None)
            if not cod: continue
            ora = next((c.replace('.', ':') for c in celle if re.fullmatch(r'\d{1,2}[.:]\d{2}', c)), None)
            g = next((c.lower() for c in celle if c.lower() in ('sabato', 'domenica')), None)
            resto = [c for c in celle[1:] if c != cod and c.replace('.', ':') != ora
                     and c.lower() not in ('sabato', 'domenica', 'ufficiale')]
            campo, ind = (resto + ['', ''])[:2]
            out.append({'societa': celle[0], 'codice': cod, 'campo': campo, 'ora': ora, 'indirizzo': ind, 'giorno': g})
    if out: return out
    words = page.extract_words(x_tolerance=2)
    rs = righe(words)
    hdr = None
    for t, ws in rs:
        up = [w['text'].upper() for w in ws]
        if any(u.startswith('SOCIET') for u in up) and ('INDIRIZZO' in up):
            hdr = {u.rstrip('.'): w['x0'] for u, w in zip(up, ws)}
            hdr_top = t
            break
    if not hdr: return out
    xs = {'soc': 0, 'n': hdr.get('N', 0) - 8, 'campo': hdr.get('CAMPO', hdr.get('CAMPO/LOCALITÀ', 0)) - 4,
          'ind': hdr['INDIRIZZO'] - 4, 'ora': hdr.get('ORARIO', page.width) - 6, 'giorno': hdr.get('GIORNO', page.width) - 6}
    order = sorted(xs.items(), key=lambda kv: kv[1])
    def cella(ws, key):
        k = [n for n, _ in order].index(key)
        lo = order[k][1]; hi = order[k + 1][1] if k + 1 < len(order) else page.width
        return testo([w for w in ws if lo <= w['x0'] < hi])
    prec = None
    for t, ws in rs:
        if t <= hdr_top or not ws: continue
        if ws[0]['text'].startswith('La') and 'Società' in testo(ws[:3]): break
        cod = cella(ws, 'n')
        if cod.isdigit():
            ora = cella(ws, 'ora').replace('.', ':')
            if not re.fullmatch(r'\d{1,2}:\d{2}', ora): ora = None
            g = cella(ws, 'giorno').lower()
            prec = {'societa': cella(ws, 'soc'), 'codice': cod, 'campo': cella(ws, 'campo'), 'ora': ora,
                    'indirizzo': cella(ws, 'ind'), 'giorno': g if g in ('sabato', 'domenica') else None}
            out.append(prec)
        elif prec and t - hdr_top > 0:  # riga a capo (nome o campo su due righe)
            for key, fld in (('soc', 'societa'), ('campo', 'campo'), ('ind', 'indirizzo')):
                extra = cella(ws, key)
                if extra and len(extra) < 60: prec[fld] = (prec[fld] + ' ' + extra).strip()
            prec = None
    return out


def leggi(path, categoria, stagione_inizio=2026):
    gironi = {}
    corrente = None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            g = girone_di(page) or corrente
            p = leggi_calendario(page, stagione_inizio)
            if p:
                corrente = g
                gironi.setdefault(g, {'partite': [], 'campi': []})['partite'] += p
            else:
                c = leggi_campi(page)
                if c and g: gironi.setdefault(g, {'partite': [], 'campi': []})['campi'] += c
    return {'fonte': path.split('/')[-1], 'categoria': categoria, 'gironi': gironi}


if __name__ == '__main__':
    print(json.dumps(leggi(sys.argv[1], sys.argv[2]), ensure_ascii=False, indent=1))
