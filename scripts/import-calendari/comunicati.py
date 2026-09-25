"""Comunicati ufficiali settimanali → gare confermate o variate.

Uso: python3 scripts/import-calendari/comunicati.py [cartella]
  cartella (di norma private/comunicati/, esclusa da git): i PDF dei comunicati (CRL e delegazioni), messi a mano.
Legge scripts/import-calendari/dati/calendari.json (da prepara.py) e scrive dati/comunicati.json,
applicato poi da applica-comunicati.mjs. Dai comunicati si prendono SOLO i dati delle gare
(date, ore, campi, società): mai i nomi delle persone (provvedimenti disciplinari).

Regole:
- VARIATA: la gara è nelle tabelle "GARA VARIATA" / "POSTICIPO" / "RIPETIZIONE GARA" del suo campionato,
  oppure la società di casa ha cambiato ora o giorno "per tutto il campionato" (vale per le gare dopo il comunicato);
- CONFERMATA: la gara si gioca tra la data del comunicato e la domenica successiva e quel comunicato
  (dell'ente che organizza il campionato: CRL per regionali ed élite, la delegazione per i provinciali)
  non la varia;
- tutto il resto resta "da calendario". Le coppe si ignorano.
I comunicati si applicano in ordine di data: il più recente vince."""
import datetime as dt
import glob
import json
import os
import re
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from prepara import maiuscolo, giorno_partita, punteggio  # noqa: E402

TABELLE = ('GARA VARIATA', 'POSTICIPO', 'ANTICIPO', 'RIPETIZIONE GARA PER DELIBERA')
DATA = re.compile(r'^\d{2}/\d{2}/\d{4}$')
ORA = re.compile(r'^\d{1,2}[:.]\d{2}$')


def iso(d):
    g, m, a = d.split('/')
    return f'{a}-{m}-{g}'


def categoria_da_titolo(titolo, ente):
    """"ALLIEVI REGIONALI U16 ELITE" (CRL) → "Under 16 Élite"; "GIOVANISSIMI PROV. UNDER 15-LC" → "Under 15 Provinciali Lecco" """
    t = maiuscolo(titolo)
    if re.search(r'COPPA|FEMM|C5|CALCIO A 5|UNDER 1?8|UNDER 21|TORNEO|CATEGORIA|ECCELLENZA|PROMOZIONE', t):
        return None
    eta = re.search(r'(?<![A-Z])(?:UNDER|U)\s?\.?\s?(1[4-9])(?!\d)', t)
    eta = '19' if 'JUNIORES' in t else eta.group(1) if eta else None
    if not eta:
        return None
    base = f'Under {eta}' + (' Juniores' if eta == '19' else '')
    if ente == 'CRL':
        return f'{base} Élite' if 'ELITE' in t else f'{base} Regionali'
    return f'{base} Provinciali {ente}'


def ente_di(categoria):
    m = re.search(r'Provinciali (\w+)', categoria)
    return m.group(1) if m else 'CRL'


# --- Lettura del PDF ----------------------------------------------------------------------
def righe_pdf(percorso):
    """Righe di testo (con dimensione del carattere) e tabelle, pagina dopo pagina, nell'ordine della pagina"""
    import pdfplumber
    out = []
    with pdfplumber.open(percorso) as pdf:
        for n, pg in enumerate(pdf.pages):
            tabelle = [(t.bbox, t.extract()) for t in pg.find_tables()]
            dentro = lambda w: any(x0 - 1 <= w['x0'] <= x1 + 1 and top - 1 <= w['top'] <= bot + 1 for (x0, top, x1, bot), _ in tabelle)
            gruppi = []
            for w in sorted(pg.extract_words(extra_attrs=['size']), key=lambda w: (round(w['top']), w['x0'])):
                if dentro(w):
                    continue
                if gruppi and abs(gruppi[-1][0]['top'] - w['top']) < 2.5:
                    gruppi[-1].append(w)
                else:
                    gruppi.append([w])
            voci = [{'top': g[0]['top'], 'size': max(w['size'] for w in g),
                     'testo': ' '.join(w['text'] for w in sorted(g, key=lambda w: w['x0']))} for g in gruppi]
            voci += [{'top': bbox[1], 'tabella': righe} for bbox, righe in tabelle]
            out += sorted(voci, key=lambda v: v['top'])
    return out


def intestazione(righe):
    testo = '\n'.join(r['testo'] for r in righe[:80] if 'testo' in r)
    cu = re.search(r'Comunicato Ufficiale N[°r.]*\s*(\d+)\s+del\s+(\d{2}/\d{2}/\d{4})', testo)
    dele = re.search(r'DELEGAZIONE PROVINCIALE DI (\w+)', testo, re.I)
    ente = dele.group(1).title() if dele else 'CRL'
    return {'ente': ente, 'numero': int(cu.group(1)), 'data': iso(cu.group(2)),
            'etichetta': f'C.U. n. {cu.group(1)} del {cu.group(2)}' + (f' ({ente})' if ente != 'CRL' else ' (CRL)')}


def tabelle_variate(righe, ente):
    """Righe delle tabelle di variazione: categoria, girone, giornata, squadre, nuova data/ora, impianto"""
    out, titolo, categoria, tipo, girone, attiva = [], None, None, None, None, False
    pulisci = lambda c: re.sub(r'\s+', ' ', c or '').strip()
    for r in righe:
        if 'tabella' in r:
            if not (attiva and categoria):
                continue
            for c in r['tabella']:
                c = [pulisci(x) for x in c]
                gt = re.fullmatch(r'(\d+)\s*([AR])', c[1]) if len(c) >= 8 else None
                if not (gt and DATA.match(c[0])):
                    continue
                out.append({'ente': ente, 'categoria': categoria, 'girone': girone, 'tipo': tipo, 'data': iso(c[0]),
                            'giornata': int(gt.group(1)), 'turno': 'andata' if gt.group(2) == 'A' else 'ritorno',
                            'casa': c[2], 'trasferta': c[3], 'data_orig': iso(c[4]) if DATA.match(c[4]) else None,
                            'ora': c[5].replace('.', ':') if ORA.match(c[5]) else None,
                            'ora_orig': c[6].replace('.', ':') if ORA.match(c[6]) else None, 'impianto': c[7] or None})
            continue
        t = r['testo'].strip()
        if re.fullmatch(r'\d+ / \d+', t):   # piè di pagina
            continue
        if r['size'] >= 17:
            if t == 'VARIAZIONI AL PROGRAMMA GARE':
                categoria = categoria_da_titolo(titolo or '', ente)
            else:
                titolo, categoria, attiva = t, None, False
        elif r['size'] >= 15:
            tipo, attiva = t, t in TABELLE
        elif r['size'] >= 11 and attiva:
            m = re.fullmatch(r'GIRONE\s+(\w+)', t)
            if m:
                girone = m.group(1)
            else:
                attiva = False
    return out


def regole_stagione(righe, ente, data_cu):
    """"La Società X disputerà le gare casalinghe di campionato alle ore 14.30 [di Sabato] …" """
    out, titolo, girone, dentro = [], None, None, False
    testo_righe = [r['testo'].strip() for r in righe if 'testo' in r]
    i = 0
    while i < len(testo_righe):
        t = testo_righe[i]
        if re.match(r'^\d+(\.\d+)+\s', t):
            dentro = 'VARIAZIONE GARE' in t.upper() or 'VARIAZIONI GARE' in t.upper()
            i += 1
            continue
        if not dentro or re.fullmatch(r'\d+ / \d+', t):
            i += 1
            continue
        m = re.fullmatch(r'Girone\s+(\w+)(\s*\(.*\))?', t)
        if m:
            girone = m.group(1)
        elif t.startswith('La Società'):
            frase = t
            while i + 1 < len(testo_righe) and not re.match(r'^(La Società|Girone\s|\d+(\.\d+)+\s)', testo_righe[i + 1]) \
                    and not (testo_righe[i + 1].isupper() and len(testo_righe[i + 1]) < 45):
                i += 1
                if not re.fullmatch(r'\d+ / \d+', testo_righe[i]):
                    frase += ' ' + testo_righe[i]
            out.append(leggi_regola(frase, titolo, girone, ente, data_cu))
        elif t.isupper() or re.match(r'^[A-Z0-9 .\-’\'()]+$', t):
            titolo, girone = t, None
        i += 1
    return [r for r in out if r]


def leggi_regola(frase, titolo, girone, ente, data_cu):
    categoria = categoria_da_titolo(titolo or '', ente)
    soc = re.match(r'La Società\s+(.+?)\s+(?:matricola|disputerà)', frase)
    prima = re.split(r'anzich', frase)[0]
    ora = re.search(r'alle\s+ore\s+(\d{1,2})[.:](\d{2})', prima)
    if not (categoria and girone and soc and ora):
        return None
    giorno = re.search(r'\b(?:di|il|la)\s+(Sabato|Domenica)\b', prima, re.I)
    fino = re.search(r'dalla\s+(\d+)°?\s+giornata di andata fino alla\s+(\d+)°?\s+giornata di andata', frase)
    legale = 'ora legale' in frase
    a = int(data_cu[:4])
    fine_legale = max(dt.date(a, 10, d) for d in range(25, 32) if dt.date(a, 10, d).weekday() == 6)
    return {'categoria': categoria, 'girone': girone, 'societa': soc.group(1), 'ora': f'{int(ora.group(1)):02d}:{ora.group(2)}',
            'giorno': giorno.group(1).lower() if giorno else None,
            'giornate': [int(fino.group(1)), int(fino.group(2))] if fino else None,
            'fino_al': fine_legale.isoformat() if legale else None}


# --- Abbinamento alle gare dei calendari --------------------------------------------------
def chiave(p):
    return '|'.join([p['stagione'], p['categoria'], p['girone'], p['casa']['chiave'] + p['casa']['squadra'],
                     p['trasferta']['chiave'] + p['trasferta']['squadra']])


def somiglia(nome, s):
    return max(punteggio(nome, s['ufficiale']), punteggio(nome, s['calendario']))


def stesso_campo(impianto, p):
    """L'impianto del comunicato è lo stesso del calendario? (parole in comune)"""
    parole = lambda s: {w for w in re.findall(r'[A-Z0-9]{3,}', maiuscolo(s or '')) if w not in {'VIA', 'COMUNALE', 'CAMPO'}}
    a, b = parole(impianto), parole(f"{p.get('campo')} {p.get('indirizzo')}")
    return bool(a) and len(a & b) / len(a) >= 0.5


def main():
    radice = os.path.join(os.path.dirname(__file__), '..', '..')
    cartella = sys.argv[1] if len(sys.argv) > 1 else os.path.join(radice, 'private', 'comunicati')
    partite = json.load(open(os.path.join(os.path.dirname(__file__), 'dati', 'calendari.json'), encoding='utf-8'))
    per_giornata = defaultdict(list)
    per_girone = defaultdict(list)
    for p in partite:
        per_giornata[(p['categoria'], p['girone'], p['giornata'], p['turno'])].append(p)
        per_girone[(p['categoria'], p['girone'])].append(p)
    categorie = {p['categoria'] for p in partite}
    campi_casa = defaultdict(lambda: defaultdict(int))
    for p in partite:
        if p.get('campo'):
            campi_casa[p['casa']['chiave'] + p['casa']['squadra']][(p['campo'], p.get('indirizzo'), p.get('codice_campo'))] += 1

    def campo_di(s):
        c = campi_casa.get(s['chiave'] + s['squadra'])
        return max(c, key=c.get) if c else (None, None, None)

    comunicati = []
    for f in sorted(glob.glob(os.path.join(cartella, '*.pdf'))):
        righe = righe_pdf(f)
        cu = intestazione(righe)
        cu['file'] = os.path.basename(f)
        cu['variate'] = tabelle_variate(righe, cu['ente'])
        cu['regole'] = regole_stagione(righe, cu['ente'], cu['data'])
        comunicati.append(cu)
    comunicati.sort(key=lambda c: (c['data'], c['numero']))

    esiti, non_trovate, note = {}, [], []
    for cu in comunicati:
        print(f"\n📄 {cu['etichetta']} · {cu['file']}")
        # 1) ora o giorno per tutto il campionato
        for r in cu['regole']:
            if r['categoria'] not in categorie:
                continue
            gare = per_girone[(r['categoria'], r['girone'])]
            casa = max({p['casa']['chiave'] + p['casa']['squadra']: p['casa'] for p in gare}.values(),
                       key=lambda s: somiglia(r['societa'], s), default=None)
            if not casa or somiglia(r['societa'], casa) < 1.2:
                # girone scritto male nel comunicato: si cerca la società negli altri gironi della categoria
                altri = [p for (c, g), ps in per_girone.items() if c == r['categoria'] for p in ps]
                casa = max({p['casa']['chiave'] + p['casa']['squadra']: p['casa'] for p in altri}.values(),
                           key=lambda s: somiglia(r['societa'], s), default=None)
                gare = [p for p in altri if casa and p['casa']['chiave'] == casa['chiave']]
                if casa and somiglia(r['societa'], casa) >= 1.2:
                    note.append(f"{cu['etichetta']}: {r['societa']} ({r['categoria']}) indicata nel girone {r['girone']}, "
                                f"ma nei calendari gioca nel girone {gare[0]['girone']}: regola applicata lì")
            if not casa or somiglia(r['societa'], casa) < 1.2:
                note.append(f"{cu['etichetta']}: regola per {r['societa']} ({r['categoria']} {r['girone']}) senza gare")
                continue
            n = 0
            for p in gare:
                if p['casa'] is not casa and p['casa']['chiave'] + p['casa']['squadra'] != casa['chiave'] + casa['squadra']:
                    continue
                d = dt.date.fromisoformat(p['data'])
                if p['data'] < cu['data'] or d.weekday() < 5 or (r['fino_al'] and p['data'] >= r['fino_al']):
                    continue
                if r['giornate'] and not (p['turno'] == 'andata' and r['giornate'][0] <= p['giornata'] <= r['giornate'][1]):
                    continue
                nuova = giorno_partita(p['data'], r['giorno']).isoformat() if r['giorno'] else p['data']
                if nuova == p['data'] and r['ora'] == p['ora']:
                    continue
                esiti[chiave(p)] = {'chiave': chiave(p), 'stato': 'variata', 'comunicato': cu['etichetta'], 'data': nuova,
                                    'ora': r['ora'], 'campo': None, 'motivo': f"{casa['nome']}: gare in casa alle {r['ora']}"
                                    + (f" di {r['giorno']}" if r['giorno'] else '') + ' (per tutto il campionato)',
                                    'gara': f"{p['categoria']} {p['girone']} · {p['casa']['nome']} – {p['trasferta']['nome']}"}
                n += 1
            print(f"   ⏱  {r['categoria']} {r['girone']} · {casa['nome']}: ore {r['ora']}"
                  + (f" di {r['giorno']}" if r['giorno'] else '') + f" → {n} gare")
        # 2) tabelle delle gare variate
        for v in cu['variate']:
            if v['categoria'] not in categorie:
                continue
            cand = per_giornata[(v['categoria'], v['girone'], v['giornata'], v['turno'])]
            dritta = lambda p: min(somiglia(v['casa'], p['casa']), somiglia(v['trasferta'], p['trasferta']))
            rovescia = lambda p: min(somiglia(v['casa'], p['trasferta']), somiglia(v['trasferta'], p['casa']))
            migliore = max(cand, key=lambda p: max(dritta(p), rovescia(p)), default=None)
            descr = f"{v['categoria']} {v['girone']} g.{v['giornata']}{v['turno'][0].upper()} · {v['casa']} – {v['trasferta']}"
            if not migliore or max(dritta(migliore), rovescia(migliore)) < 1.2:
                non_trovate.append(f"{cu['etichetta']}: {descr}")
                continue
            p = migliore
            inverti = rovescia(p) > dritta(p)   # inversione di campo: si gioca a casa dell'altra squadra
            nuova_casa = p['trasferta'] if inverti else p['casa']
            campo = indirizzo = codice = None
            if v['impianto'] and not stesso_campo(v['impianto'], p if not inverti else {}):
                campo = v['impianto']
            elif inverti:
                campo, indirizzo, codice = campo_di(nuova_casa)
            gara = f"{p['categoria']} {p['girone']} · {p['casa']['nome']} – {p['trasferta']['nome']}"
            esiti[chiave(p)] = {'chiave': chiave(p), 'stato': 'variata', 'comunicato': cu['etichetta'], 'data': v['data'],
                                'ora': v['ora'] or p['ora'], 'campo': campo, 'indirizzo': indirizzo, 'codice_campo': codice,
                                'inverti': inverti,
                                'motivo': ' · '.join(x for x in [
                                    f"inversione di campo: si gioca in casa di {nuova_casa['nome']}" if inverti else '',
                                    f"data {p['data']} → {v['data']}" if v['data'] != p['data'] else '',
                                    f"ora {p['ora'] or '?'} → {v['ora']}" if v['ora'] and v['ora'] != p['ora'] else '',
                                    f"campo → {campo}" if campo else '',
                                    v['tipo'].lower() if v['tipo'] != 'GARA VARIATA' else ''] if x) or 'confermata con variazione',
                                'gara': gara}
            print(f"   ✎ {gara}: {esiti[chiave(p)]['motivo']}")
        # 3) confermate: gare di quel fine settimana dei campionati dell'ente, non variate
        inizio = dt.date.fromisoformat(cu['data'])
        fine = inizio + dt.timedelta(days=(6 - inizio.weekday()) or 7)
        n = 0
        for p in partite:
            if ente_di(p['categoria']) != cu['ente'] or not (inizio.isoformat() <= p['data'] <= fine.isoformat()):
                continue
            k = chiave(p)
            if esiti.get(k, {}).get('stato') == 'variata':
                continue
            esiti[k] = {'chiave': k, 'stato': 'confermata', 'comunicato': cu['etichetta'], 'data': p['data'], 'ora': p['ora'],
                        'campo': None, 'motivo': '', 'gara': f"{p['categoria']} {p['girone']} · {p['casa']['nome']} – {p['trasferta']['nome']}"}
            n += 1
        print(f"   ✓ {n} gare dal {inizio:%d/%m} al {fine:%d/%m} confermate")

    uscita = os.path.join(os.path.dirname(__file__), 'dati', 'comunicati.json')
    json.dump(list(esiti.values()), open(uscita, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    conta = defaultdict(int)
    for e in esiti.values():
        conta[e['stato']] += 1
    print(f"\n{conta['variata']} variate, {conta['confermata']} confermate → {uscita}")
    senza = [c for c in categorie if not any(ente_di(c) == cu['ente'] for cu in comunicati)]
    if senza:
        print('Nessun comunicato per: ' + ', '.join(sorted(senza)))
    for x in non_trovate:
        print('  ? non trovata nei calendari: ' + x)
    for x in note:
        print('  ? ' + x)


if __name__ == '__main__':
    main()
