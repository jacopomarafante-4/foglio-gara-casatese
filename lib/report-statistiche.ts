// Report PDF delle statistiche della squadra (solo admin), come statsPages/downloadStatsPdf del Portale: A4 orizzontale,
// pagine disegnate su tela. 1 riepilogo · 2 presenze allenamenti giorno per giorno · 3 partite: minuti, gol, subiti ·
// 4 presenze per mese e test atletici. Solo nel browser.
import { MUTED, BLU, tela, T, intestazioneSocieta, tabella, stemmi, type Ctx, type Colonna } from '@/lib/tela';
import { fmtData, type Partita } from '@/lib/programma';
import { meseDi } from '@/lib/calendario-portale';
import {
  MOTIVI, SOGLIA_PRESENZE, assente, haGiocato, inPortaGara, infoGara, pctTesto, percentuale, presenzaDi, presenzePerMese, risultato,
  statisticheAllenamento, statistichePartite, tempoCella, type Registro, type Test,
} from '@/lib/registro';

const W = 1188, H = 840, K = 2.5;
const RIEMPI: Record<string, string> = { P: '#DDEFE2', A: '#F6D5DA', MAL: '#F6D5DA', SCU: '#FBEBC8', FAM: '#FBEBC8', ING: '#F2C4CB', INF: '#E4D9F2' };
const SIGLA: Record<string, string> = Object.fromEntries(MOTIVI.map((m) => [m.k, m.s]));
const aPezzi = <T,>(a: T[], n: number) => (a.length ? Array.from({ length: Math.ceil(a.length / n) }, (_, i) => a.slice(i * n, i * n + n)) : [[]] as T[][]);
const num = (v: unknown) => +(v as number) || 0;

type Dati = {
  squadra: { name: string; category: string }; giocatori: { id: string; name: string }[];
  reg: Registro & { tests?: Test[] }; calendario: (Partita & { id: string })[]; periodo: string; oggi: string;
};

export async function creaReport(d: Dati) {
  const { logo, figc } = await stemmi();
  const { jsPDF } = await import('jspdf');
  const sa = statisticheAllenamento(d.reg, d.giocatori, d.periodo);
  const sp = statistichePartite(d.reg, d.giocatori, d.calendario, d.periodo);
  const portieri = d.reg.gk ?? [], gk = (id: string) => portieri.includes(id);
  const sub = `${d.periodo === 'all' ? 'Tutta la stagione' : meseDi(d.periodo)} · aggiornato al ${fmtData(d.oggi)}`;
  const mx = 36, tw = W - 2 * mx, pagine: HTMLCanvasElement[] = [];
  const rhPer = (y: number, n: number) => Math.max(14, Math.min(26, (H - 50 - y) / Math.max(n, 1)));
  const testa = (x: Ctx, titolo: string) => {
    intestazioneSocieta(x, W, mx, 16, logo, figc, d.squadra.category || d.squadra.name);
    T(x, titolo, mx, 136, { size: 24, weight: 700, cond: true });
    T(x, sub, W - mx, 136, { size: 13, color: MUTED, align: 'right', max: 600 });
    x.fillStyle = BLU; x.fillRect(mx, 146, W - 2 * mx, 2);
    return 162;
  };
  const piede = (x: Ctx) => T(x, `Report statistiche · ${d.squadra.name}`, mx, H - 18, { size: 11, color: MUTED });
  const riga = (id: string) => ({ a: sa.righe.find((r) => r.p.id === id)!, p: sp.righe.find((r) => r.p.id === id)! });

  // 1. Riepilogo
  {
    const [c, x] = tela(W, H, K); let y = testa(x, 'Riepilogo statistiche');
    const k: [string | number, string][] = [[sa.tr.length, 'Allenamenti'], [pctTesto(sa.media), 'Presenza media'], [sp.gm.length, 'Partite giocate'],
      [sp.nNoti ? `${sp.v}V ${sp.n}N ${sp.p}P` : '—', 'Risultati'], [sp.nNoti ? `${sp.gf}-${sp.gs}` : '—', 'Gol fatti-subiti'], [sa.sottoSoglia, `Sotto il ${SOGLIA_PRESENZE * 100}% presenze`]];
    const kw = tw / k.length;
    k.forEach(([v, l], i) => { x.strokeStyle = '#D5DDD8'; x.lineWidth = 1; x.strokeRect(mx + i * kw + 4, y, kw - 8, 56); T(x, v, mx + i * kw + kw / 2, y + 26, { size: 22, weight: 700, align: 'center', cond: true }); T(x, l, mx + i * kw + kw / 2, y + 45, { size: 11, color: MUTED, align: 'center' }); });
    y += 72;
    const cols: Colonna[] = [{ t: 'GIOCATORE', w: 230, al: 'left' }, { t: 'PRES. ALL.', w: 80 }, { t: 'ASSENZE', w: 74 }, { t: 'DI CUI INF.', w: 80 }, { t: '% PRES.', w: 80 },
      { t: 'PARTITE', w: 76 }, { t: 'MINUTI', w: 80 }, { t: '% MIN', w: 72 }, { t: 'MEDIA', w: 70 }, { t: 'GOL', w: 60 }, { t: 'SUBITI (POR)', w: 96 }];
    const scala = tw / cols.reduce((a, c2) => a + c2.w, 0); cols.forEach((c2) => { c2.w *= scala; });
    const dati = d.giocatori.map((g) => { const { a, p } = riga(g.id);
      return [(gk(g.id) ? '(P) ' : '') + g.name, a.c.P, a.assenze, a.c.INF || '', pctTesto(a.pct), p.pres, p.min, pctTesto(p.pctMin), p.media != null ? Math.round(p.media) + "'" : '—', p.gol || '', p.inPorta ? p.gc : '']; });
    tabella(x, mx, y, cols, dati, { rh: rhPer(y + 24, dati.length), fill: (ri, ci) => { const a = riga(d.giocatori[ri].id).a; return ci === 4 && a.pct != null && a.pct < SOGLIA_PRESENZE ? '#F6D5DA' : null; } });
    piede(x); pagine.push(c);
  }

  // 2. Presenze allenamenti giorno per giorno
  aPezzi(sa.tr, 24).forEach((parte, pi, tutte) => {
    const [c, x] = tela(W, H, K); const y = testa(x, 'Presenze allenamenti' + (tutte.length > 1 ? ` (${pi + 1}/${tutte.length})` : ''));
    if (!parte.length) { T(x, 'Nessun allenamento registrato nel periodo.', mx, y + 30, { size: 15, color: MUTED }); piede(x); pagine.push(c); return; }
    const nomeW = 200, totW = 56, giornoW = Math.min(44, (tw - nomeW - totW * 4) / parte.length);
    const cols: Colonna[] = [{ t: 'GIOCATORE', w: nomeW, al: 'left' }, ...parte.map((t) => ({ t: fmtData(t.date).slice(0, 5), w: giornoW })), { t: 'PRES.', w: totW }, { t: 'ASS.', w: totW }, { t: 'DI CUI INF.', w: totW }, { t: '%', w: totW }];
    const dati = d.giocatori.map((g) => {
      const tutti = sa.tr.map((t) => presenzaDi(t, g.id));
      const P = tutti.filter((v) => v === 'P').length, ass = tutti.filter(assente).length, inf = tutti.filter((v) => v === 'INF').length;
      return [g.name, ...parte.map((t) => { const v = presenzaDi(t, g.id); return v === 'P' || v === 'A' ? v : SIGLA[v] ?? ''; }), P, ass, inf || '', pctTesto(percentuale(P, ass - inf))];
    });
    tabella(x, mx, y, cols, dati, { rh: rhPer(y + 24, dati.length), fs: 11, fill: (ri, ci) => (ci > 0 && ci <= parte.length ? RIEMPI[presenzaDi(parte[ci - 1], d.giocatori[ri].id)] || null : null) });
    T(x, 'P presente · assente per: ' + MOTIVI.map((m) => `${m.s} ${m.l.toLowerCase()}`).join(' · ') + ' · A motivo non indicato · gli infortuni non contano nella %', mx, H - 36, { size: 11, color: MUTED, max: tw });
    piede(x); pagine.push(c);
  });

  // 3. Minuti partita per partita
  aPezzi(sp.gm, 12).forEach((parte, pi, tutte) => {
    const [c, x] = tela(W, H, K); let y = testa(x, 'Partite: minuti, gol, gol subiti' + (tutte.length > 1 ? ` (${pi + 1}/${tutte.length})` : ''));
    if (!parte.length) { T(x, 'Nessuna partita giocata nel periodo.', mx, y + 30, { size: 15, color: MUTED }); piede(x); pagine.push(c); return; }
    const nomeW = 200, totW = 62, gW = Math.min(70, (tw - nomeW - totW * 3) / parte.length);
    const cols: Colonna[] = [{ t: 'GIOCATORE', w: nomeW, al: 'left' }, ...parte.map((g) => ({ t: fmtData(infoGara(g, d.calendario).date).slice(0, 5), w: gW })), { t: 'PRES.', w: totW }, { t: 'MINUTI', w: totW }, { t: 'GOL', w: totW }];
    let gx = mx + nomeW;
    parte.forEach((g) => { const sc = risultato(g, portieri); T(x, [infoGara(g, d.calendario).opponent, sc ? `${sc.gf}-${sc.ga}` : ''].filter(Boolean).join(' '), gx + gW / 2, y + 8, { size: 9.5, align: 'center', color: MUTED, max: gW - 4 }); gx += gW; });
    y += 16;
    const dati = d.giocatori.map((g) => { const p = riga(g.id).p;
      return [(gk(g.id) ? '(P) ' : '') + g.name, ...parte.map((gara) => {
        const v = (gara.pl ?? {})[g.id] ?? {}, m = num(v.min);
        if (!haGiocato(v)) return '—';
        if (!m) return '✓';
        return `${m}'` + (num(v.g) ? ` G${v.g}` : '') + (inPortaGara(gara, g.id, portieri) && v.gc != null && v.gc !== '' ? ` S${v.gc}` : '');
      }), p.pres, p.min, p.gol || ''];
    });
    tabella(x, mx, y, cols, dati, { rh: rhPer(y + 24, dati.length), fs: 11,
      fill: (ri, ci) => { if (ci === 0 || ci > parte.length) return null; const v = (parte[ci - 1].pl ?? {})[d.giocatori[ri].id] ?? {}; return num(v.g) ? '#DDEFE2' : haGiocato(v) ? '#EEF4FA' : null; },
      color: (_r, _c, v) => (v === '—' ? '#A0A8B0' : null) });
    T(x, 'Minuti giocati · ✓ ha giocato, minuti non registrati · G gol segnati (in verde) · S gol subiti dal portiere · (P) portiere', mx, H - 36, { size: 11, color: MUTED });
    piede(x); pagine.push(c);
  });

  // 4. Presenze per mese + test atletici
  {
    const [c, x] = tela(W, H, K); const y = testa(x, 'Presenze per mese e test atletici');
    const { mesi, per } = presenzePerMese(d.reg, d.giocatori);
    const test = (d.reg.tests ?? []).slice().sort((a, b) => a.date.localeCompare(b.date));
    const meta = (tw - 24) / 2;
    if (mesi.length) {
      const mw = Math.min(70, (meta - 170) / mesi.length);
      const cols: Colonna[] = [{ t: 'GIOCATORE', w: 170, al: 'left' }, ...mesi.map((m) => ({ t: meseDi(m).toUpperCase(), w: mw }))];
      const dati = d.giocatori.map((g) => [g.name, ...mesi.map((m) => { const o = per[g.id]?.[m]; return o && o.tot ? pctTesto(o.P / o.tot) : '—'; })]);
      tabella(x, mx, y, cols, dati, { rh: rhPer(y + 24, dati.length), fs: 11, fill: (ri, ci) => { if (!ci) return null; const o = per[d.giocatori[ri].id]?.[mesi[ci - 1]]; return o && o.tot && o.P / o.tot < SOGLIA_PRESENZE ? '#F6D5DA' : null; } });
    } else T(x, 'Nessun allenamento registrato.', mx, y + 20, { size: 14, color: MUTED });
    const tx = mx + meta + 24;
    if (test.length) {
      const tw2 = Math.min(90, (meta - 170) / test.length);
      const cols: Colonna[] = [{ t: 'GIOCATORE', w: 170, al: 'left' }, ...test.map((t) => ({ t: `${(t.name || 'TEST').toUpperCase()} ${fmtData(t.date).slice(0, 5)}`, w: tw2 }))];
      const dati = d.giocatori.map((g) => [g.name, ...test.map((t) => tempoCella(t.res?.[g.id]) || '—')]);
      tabella(x, tx, y, cols, dati, { rh: rhPer(y + 24, dati.length), fs: 10.5, color: (_r, ci, v) => (ci && v && !/\d/.test(String(v)) ? MUTED : null) });
    } else T(x, 'Nessun test registrato.', tx, y + 20, { size: 14, color: MUTED });
    piede(x); pagine.push(c);
  }

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pagine.forEach((c, i) => { if (i) doc.addPage(); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210); });
  const nome = ['REPORT', (d.squadra.category || d.squadra.name).replace(/[^\w]+/g, '_').toUpperCase(), d.periodo === 'all' ? 'STAGIONE' : d.periodo, d.oggi].filter(Boolean).join('_') + '.pdf';
  return { nome, blob: doc.output('blob') };
}
