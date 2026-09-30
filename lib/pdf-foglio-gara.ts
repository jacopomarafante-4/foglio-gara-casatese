// Foglio gara (tappa 3; era coverPage/schemePage/downloadPdf di pdf.js del Portale): A4 orizzontale disegnato su tela.
// Pagina 1: titolari e panchina col numero di maglia della partita, campo col modulo, modulo, capitani, piazzati scelti e note.
// Poi una pagina per ogni schema scelto: campo con pedine, frecce e scritte, nota sotto, riquadro dei Compiti. Solo nel browser.
import { BLU, BLU_SCURO, CARTA, GRASS, INK, LINE_C, MUTED, RED, T, font, rrect, righeTesto, striscia, taglia, tela, testoInRiquadro, caricaImmagine, type Ctx } from '@/lib/tela';
import { fmtData, type Partita } from '@/lib/programma';
import { luogoPartita, type FoglioPartita } from '@/lib/foglio';
import { MODULO_BASE, cognome, numeroMaglia, posizione, posizioniDi, titolari, type FoglioFormazione } from '@/lib/formazione';
import { VX0, VX1, VY0, VY1, YS, coloreDi, coloriCompiti, giocatoreDi, notaDi, palloneDi, pedine, scritteDi, segniDi, type FoglioPiazzati, type Schema } from '@/lib/piazzati';

export type FoglioGara = FoglioPartita & FoglioFormazione & FoglioPiazzati;
export type DatiFoglioGara = {
  foglio: FoglioGara; nomeSquadra: string; categoria: string; giocatori: { id: string; name: string }[];
  calendario: (Partita & { ll?: string })[]; schemi: Schema[];
};
const W = 1188, H = 840, K = 2.5;
const G1 = '#E3EFE6', G2 = '#D8E9DD';

/** Schemi scelti per la partita, nell'ordine della scelta (quelli che non ci sono più si saltano) */
export const schemiScelti = (f: FoglioGara, schemi: Schema[]) =>
  ((f.selected ?? []) as string[]).map((id) => schemi.find((q) => q.id === id)).filter(Boolean) as Schema[];

function intestazione(x: Ctx, d: DatiFoglioGara, logo: HTMLImageElement | null, titolo: string, sotto: string, pagina: number, totale: number) {
  const s = d.foglio;
  let tx = 36;
  if (logo) { x.drawImage(logo, 32, 16, 72, 72); tx = 120; }
  T(x, titolo, tx, 58, { size: 38, weight: 700, cond: true, color: BLU_SCURO, max: 560 });
  if (sotto) T(x, sotto, tx, 86, { size: 16, weight: 500, color: MUTED, max: 560 });
  striscia(x, 0, 102, W, 3);
  const noi = s.team || d.nomeSquadra, luogo = luogoPartita(s, d.calendario);
  const destra = [s.opponent ? (s.home ? `${noi} – ${s.opponent}` : `${s.opponent} – ${noi}`) : noi,
    [s.date ? fmtData(s.date) : '', s.time].filter(Boolean).join(' · ore '), [luogo.venue, d.categoria].filter(Boolean).join(' · ')].filter(Boolean);
  destra.forEach((r, i) => T(x, r, W - 36, 40 + i * 24, { size: i ? 15 : 21, weight: i ? 500 : 700, align: 'right', color: i ? MUTED : INK, cond: !i, max: 470 }));
  x.fillStyle = LINE_C; x.fillRect(36, H - 26, W - 72, 1);
  T(x, 'Academy Casatese Merate · Foglio gara', 36, H - 9, { size: 12, weight: 600, color: MUTED });
  T(x, `${pagina} / ${totale}`, W - 36, H - 9, { size: 12, color: MUTED, align: 'right' });
}
function disco(x: Ctx, cx: number, cy: number, r: number, colore: string, testo: string | number, o: { vuoto?: boolean; size?: number } = {}) {
  x.beginPath(); x.arc(cx, cy, r, 0, Math.PI * 2);
  if (o.vuoto) { x.fillStyle = '#fff'; x.fill(); x.setLineDash([4, 3]); x.lineWidth = 2; x.strokeStyle = colore; x.stroke(); x.setLineDash([]); }
  else { x.fillStyle = colore; x.fill(); x.lineWidth = 2.5; x.strokeStyle = '#fff'; x.stroke(); }
  T(x, testo, cx, cy + 1, { size: o.size || r * 1.05, weight: 700, cond: true, align: 'center', base: 'middle', color: o.vuoto ? colore : '#fff' });
}
function segno(x: Ctx, x1: number, y1: number, x2: number, y2: number, freccia: boolean, tratteggio?: boolean) {
  x.save();
  x.strokeStyle = RED; x.lineWidth = tratteggio ? 2.5 : 3; x.lineCap = 'round';
  if (tratteggio) x.setLineDash([10, 8]);
  x.beginPath(); x.moveTo(x1, y1); x.lineTo(x2, y2); x.stroke();
  x.setLineDash([]);
  if (freccia) {
    const a = Math.atan2(y2 - y1, x2 - x1), l = 15;
    x.beginPath(); x.moveTo(x2, y2);
    x.lineTo(x2 - l * Math.cos(a - Math.PI / 7), y2 - l * Math.sin(a - Math.PI / 7));
    x.lineTo(x2 - l * Math.cos(a + Math.PI / 7), y2 - l * Math.sin(a + Math.PI / 7));
    x.closePath(); x.fillStyle = RED; x.fill();
  }
  x.restore();
}
const fascia = (x: Ctx, cx: number, cy: number, r: number, t: string) => {
  x.fillStyle = '#E3A008'; x.beginPath(); x.arc(cx, cy, r, 0, 7); x.fill();
  T(x, t, cx, cy + 1, { size: t.length > 1 ? r * 0.9 : r * 1.2, weight: 700, align: 'center', base: 'middle', color: INK });
};

function copertina(d: DatiFoglioGara, logo: HTMLImageElement | null, totale: number) {
  const [c, x] = tela(W, H, K), s = d.foglio;
  const P = (id?: string | null) => (id ? d.giocatori.find((g) => g.id === id) : undefined);
  const num = (id: string) => numeroMaglia(s, id);
  intestazione(x, d, logo, 'Foglio gara', s.opponent ? `Distinta e formazione contro ${s.opponent}` : 'Distinta e formazione', 1, totale);
  // Distinta
  const tit = titolari(s).map((t) => ({ ...t, p: P(t.pid) }));
  const panca = (s.bench ?? []).map((id) => P(id)).filter(Boolean) as { id: string; name: string }[];
  const rh = Math.min(27, (H - 150 - 60 - 60) / Math.max(tit.length + panca.length, 1));
  let y = 158, zebra = 0;
  const riga = (p: { id: string; name: string } | undefined, titolare: boolean) => {
    if (zebra++ % 2 === 0) { x.fillStyle = CARTA; rrect(x, 30, y - rh * 0.8, 350, rh, 6); x.fill(); }
    x.fillStyle = titolare ? BLU_SCURO : GRASS; rrect(x, 36, y - rh * 0.72, 36, rh * 0.86, 5); x.fill();
    T(x, p ? (num(p.id) ?? '–') : '–', 54, y - rh * 0.29 + 1, { size: Math.min(18, rh * 0.7), weight: 700, cond: true, align: 'center', base: 'middle', color: '#fff' });
    T(x, p ? p.name : 'Da assegnare', 82, y - rh * 0.29 + 1, { size: Math.min(17, rh * 0.66), weight: p ? 600 : 500, color: p ? INK : MUTED, base: 'middle', max: 250 });
    const f = p && (p.id === s.captain ? 'K' : p.id === s.vice ? 'VK' : '');
    if (f) fascia(x, 356, y - rh * 0.29, 11, f);
    y += rh;
  };
  T(x, 'Titolari', 36, 146, { size: 21, weight: 700, cond: true, color: BLU_SCURO }); y = 146 + rh + 4;
  tit.forEach((t) => riga(t.p, true));
  y += 18; zebra = 0; T(x, 'Panchina', 36, y, { size: 21, weight: 700, cond: true, color: BLU_SCURO }); y += rh + 4;
  if (panca.length) panca.forEach((p) => riga(p, false)); else T(x, 'Nessun giocatore in panchina', 36, y - 8, { size: 14, color: MUTED });
  // Campo intero col modulo
  const ph = H - 150 - 52, pw = (ph * 68) / 105, px = 400 + (440 - pw) / 2 + 20, py = 146, m = pw / 68;
  for (let i = 0; i < 12; i++) { x.fillStyle = i % 2 ? G2 : G1; x.fillRect(px, py + (i * ph) / 12, pw, ph / 12 + 0.5); }
  x.strokeStyle = GRASS; x.lineWidth = 2; x.strokeRect(px, py, pw, ph);
  x.beginPath(); x.moveTo(px, py + ph / 2); x.lineTo(px + pw, py + ph / 2); x.stroke();
  x.beginPath(); x.arc(px + pw / 2, py + ph / 2, 9.15 * m, 0, 7); x.stroke();
  for (const [yy, v] of [[py, 1], [py + ph, -1]]) {
    x.strokeRect(px + pw / 2 - 20.16 * m, v > 0 ? yy : yy - 16.5 * m, 40.32 * m, 16.5 * m);
    x.strokeRect(px + pw / 2 - 9.16 * m, v > 0 ? yy : yy - 5.5 * m, 18.32 * m, 5.5 * m);
  }
  for (const [n, bx, by] of posizioniDi(s.formation)) {
    const q = posizione(s, n, bx, by), p = P((s.lineup ?? {})[n]);
    const cx = px + (q.x / 100) * pw, cy = py + (q.y / 100) * ph;
    disco(x, cx, cy, 19, INK, p ? (num(p.id) ?? n) : n, { vuoto: !p, size: 21 });
    if (p) T(x, cognome(p.name), cx, cy + 36, { size: 14, weight: 700, align: 'center', halo: 4, max: 110 });
    if (p && (p.id === s.captain || p.id === s.vice)) fascia(x, cx + 17, cy - 15, 9, p.id === s.captain ? 'K' : 'VK');
  }
  // Colonna destra, in un riquadro
  const rx = 890;
  x.strokeStyle = LINE_C; x.lineWidth = 1.5; rrect(x, rx - 18, 128, W - 36 - (rx - 18), H - 128 - 48, 12); x.stroke();
  x.fillStyle = BLU; x.fillRect(rx - 18, 128 + 12, 4, 56);
  T(x, 'Modulo', rx, 150, { size: 15, weight: 600, color: MUTED });
  T(x, s.formation || MODULO_BASE, rx, 196, { size: 50, weight: 700, cond: true, color: BLU_SCURO });
  let ry = 240;
  for (const [et, id] of [['Capitano', s.captain], ['Vice capitano', s.vice]] as [string, string | undefined][]) {
    const p = P(id); if (!p) continue;
    const n = num(p.id);
    T(x, et, rx, ry, { size: 14, color: MUTED }); T(x, `${n ? n + ' ' : ''}${p.name}`, rx, ry + 22, { size: 19, weight: 700, max: 260 }); ry += 52;
  }
  const sel = schemiScelti(s, d.schemi), fondo = H - 62, largh = W - 36 - rx - 14;
  if (sel.length) {
    ry += 8; T(x, 'Calci piazzati', rx, ry, { size: 21, weight: 700, cond: true, color: BLU_SCURO }); ry += 26;
    // una sola grandezza per tutte le righe (la più grande con cui ci stanno, fino a 12,5), lasciando spazio alle note
    const spazio = (s.notes ? fondo - 130 : fondo) - ry, testi = sel.map((q) => q.name + (q.subtitle ? ` · ${q.subtitle}` : ''));
    let size = 15; font(x, size, 600);
    while (size > 12.5 && (testi.some((t) => x.measureText(t).width > largh - 42) || sel.length * size * 1.45 > spazio)) { size -= 0.5; font(x, size, 600); }
    const lh = size * 1.45, quante = Math.max(1, Math.min(sel.length, Math.floor(spazio / lh)));
    sel.slice(0, quante).forEach((_, i) => {
      const altri = i === quante - 1 && quante < sel.length ? sel.length - quante + 1 : 0;
      T(x, `p. ${i + 2}`, rx, ry, { size: Math.min(13, size), color: MUTED });
      font(x, size, 600);
      if (altri) T(x, taglia(x, `e altri ${altri} schemi (pagine seguenti)`, largh - 42), rx + 42, ry, { size, weight: 600, color: MUTED });
      else T(x, taglia(x, testi[i], largh - 42), rx + 42, ry, { size, weight: 600 });
      ry += lh;
    });
  }
  if (s.notes) {
    ry += 16; T(x, 'Note', rx, ry, { size: 21, weight: 700, cond: true, color: BLU_SCURO }); ry += 24;
    testoInRiquadro(x, s.notes, rx, ry, largh, fondo - ry, { size: 15, min: 11, weight: 500 });
  }
  return c;
}

function paginaSchema(d: DatiFoglioGara, logo: HTMLImageElement | null, sc: Schema, pagina: number, totale: number) {
  const [c, x] = tela(W, H, K), f = d.foglio;
  const P = (id?: string | null) => (id ? d.giocatori.find((g) => g.id === id) : undefined);
  const rosa = new Set(d.giocatori.map((g) => g.id));
  intestazione(x, d, logo, sc.name, sc.subtitle || '', pagina, totale);
  // Campo grande quanto possibile, lasciando sotto lo spazio per la nota (fino a 3 righe)
  const larghSx = 720, oy = 140, nota = notaDi(sc, f);
  font(x, 22, 700, true);
  const righeNota = nota ? Math.min(3, righeTesto(x, nota, larghSx).length) : 0, notaH = righeNota ? righeNota * 26 + 14 : 0;
  const sx = Math.min(12, larghSx / (VX1 - VX0), (H - 44 - oy - notaH) / ((VY1 - VY0) * YS)), sy = sx * YS;
  const fw = (VX1 - VX0) * sx, fh = (VY1 - VY0) * sy, ox = 36 + (larghSx - fw) / 2;
  const X = (v: number) => ox + (v - VX0) * sx, Y = (v: number) => oy + (v - VY0) * sy;
  x.save(); rrect(x, ox, oy, fw, fh, 8); x.clip();
  for (let i = 0; i < 10; i++) { x.fillStyle = i % 2 ? G2 : G1; x.fillRect(ox, oy + (i * fh) / 10, fw, fh / 10 + 0.5); }
  x.restore();
  x.strokeStyle = GRASS; x.lineWidth = 2.5; x.lineCap = 'round';
  const L = (a: number, b: number, c2: number, e: number) => { x.beginPath(); x.moveTo(X(a), Y(b)); x.lineTo(X(c2), Y(e)); x.stroke(); };
  L(VX0, 0, VX1, 0); L(34, 0, 34, VY1);
  x.strokeRect(X(-20.16), Y(0), 40.32 * sx, 16.5 * sy);
  x.strokeRect(X(-9.16), Y(0), 18.32 * sx, 5.5 * sy);
  x.strokeRect(X(-3.66), Y(-2.2), 7.32 * sx, 2.2 * sy);
  const a = Math.acos(5.5 / 9.15);
  x.beginPath(); x.ellipse(X(0), Y(11), 9.15 * sx, 9.15 * sy, 0, Math.PI / 2 - a, Math.PI / 2 + a); x.stroke();
  x.beginPath(); x.arc(X(0), Y(11), 2.5, 0, 7); x.fillStyle = GRASS; x.fill();
  x.beginPath(); x.ellipse(X(34), Y(0), sx, sy, 0, Math.PI / 2, Math.PI); x.stroke();
  // pallone
  const b = palloneDi(sc, f), bx = X(b.x), by = Y(b.y), br = 1.15 * sx;
  x.beginPath(); x.arc(bx, by, br, 0, 7); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 2; x.strokeStyle = INK; x.stroke();
  x.beginPath();
  for (let i = 0; i < 5; i++) { const an = -Math.PI / 2 + (i * 2 * Math.PI) / 5; x.lineTo(bx + Math.cos(an) * br * 0.42, by + Math.sin(an) * br * 0.42); }
  x.closePath(); x.fillStyle = INK; x.fill();
  segniDi(sc, f).forEach((q) => segno(x, X(q.x1), Y(q.y1), X(q.x2), Y(q.y2), q.type === 'arrow', q.dashed));
  scritteDi(sc, f).forEach((m) => T(x, m.text, X(m.x), Y(m.y) + 1, { size: 24, weight: 700, align: 'center', base: 'middle', color: RED }));
  // pedine: sul campo solo il numero, numero e cognome nell'elenco dei compiti a destra
  const colori = coloriCompiti(sc, f), ped = pedine(sc, f), r = 1.75 * sx;
  const chi = (t: (typeof ped)[number]) => { const g = giocatoreDi(sc, t, f, rosa); return { p: P(g.pid), aMano: g.aMano }; };
  for (const t of ped) {
    const { p } = chi(t);
    disco(x, X(t.x), Y(t.y), r, coloreDi(colori, t), p ? (numeroMaglia(f, p.id) ?? t.slot) : t.slot, { vuoto: !p, size: 21 });
    if (t.tag) T(x, t.tag, X(t.x), Y(t.y) - r - 7, { size: 18, weight: 700, align: 'center', color: RED, halo: 3 });
  }
  if (nota) testoInRiquadro(x, nota, 36, oy + fh + 30, larghSx, H - 40 - (oy + fh + 22), { size: 22, min: 16, weight: 700, cond: true });
  // Riquadro dei compiti
  const rx = 790, rw = W - 36 - rx, fav = sc.side === 'favore';
  x.strokeStyle = LINE_C; x.lineWidth = 1.5; rrect(x, rx - 16, 128, rw + 16, H - 128 - 48, 12); x.stroke();
  x.fillStyle = fav ? '#DDF0E2' : '#F8DDE1'; rrect(x, rx, 140, 110, 30, 15); x.fill();
  T(x, fav ? 'A favore' : 'A sfavore', rx + 55, 156, { size: 17, weight: 700, cond: true, align: 'center', base: 'middle', color: fav ? '#1E5A36' : '#8E0C22' });
  const gruppi = new Map<string, typeof ped>();
  for (const t of ped) { const k = (t.role || '').trim() || 'Altri'; gruppi.set(k, [...(gruppi.get(k) ?? []), t]); }
  const voci = [...gruppi.entries()].sort((p1, p2) => Number(p1[0] === 'Altri') - Number(p2[0] === 'Altri'));
  const lh = Math.min(26, (H - 60 - 200 - (sc.legend ? 50 : 0)) / Math.max(ped.length + voci.length * 1.6, 1));
  T(x, 'Compiti', rx, 198, { size: 24, weight: 700, cond: true, color: BLU_SCURO });
  let gy = 232;
  for (const [compito, ts] of voci) {
    const col = colori.get(compito) || INK;
    x.fillStyle = col; x.fillRect(rx, gy - lh * 0.55, 5, lh * 0.7);
    T(x, compito, rx + 13, gy, { size: Math.min(19, lh * 0.8), weight: 700, cond: true, max: rw - 13 });
    gy += lh;
    const ordine = (t: (typeof ped)[number]) => (t.tag && !isNaN(+t.tag) ? +t.tag : t.slot);
    for (const t of ts.slice().sort((p1, p2) => (p1.tag && p2.tag && !isNaN(+p1.tag) && !isNaN(+p2.tag) ? ordine(p1) - ordine(p2) : p1.slot - p2.slot))) {
      const { p, aMano } = chi(t);
      disco(x, rx + 24, gy - lh * 0.3, Math.min(11, lh * 0.42), col, p ? (numeroMaglia(f, p.id) ?? t.slot) : t.slot, { vuoto: !p, size: Math.min(13, lh * 0.5) });
      T(x, p ? cognome(p.name) + (aMano ? ' *' : '') : `Ruolo ${t.slot} da assegnare`, rx + 44, gy - lh * 0.3 + 1,
        { size: Math.min(15.5, lh * 0.62), weight: p ? 600 : 500, color: p ? INK : MUTED, base: 'middle', max: rw - 60 });
      if (t.tag) T(x, t.tag, W - 52, gy - lh * 0.3 + 1, { size: Math.min(14, lh * 0.55), weight: 700, color: RED, align: 'right', base: 'middle' });
      gy += lh;
    }
    gy += lh * 0.5;
  }
  if (sc.legend) testoInRiquadro(x, sc.legend, rx, H - 88, rw - 8, 36, { size: 13, min: 10, weight: 500, color: MUTED });
  return c;
}

async function preparati() {
  await Promise.all(['700 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '500 20px "Barlow"', '600 20px "Barlow"', '700 20px "Barlow"']
    .map((q) => document.fonts.load(q).catch(() => null)));
  return caricaImmagine('/portale/casatese-logo.png');
}
/** Le pagine del foglio gara (anteprima e PDF) */
export async function pagineFoglioGara(d: DatiFoglioGara) {
  const logo = await preparati(), sel = schemiScelti(d.foglio, d.schemi), totale = 1 + sel.length;
  return [copertina(d, logo, totale), ...sel.map((q, i) => paginaSchema(d, logo, q, i + 2, totale))];
}
/** Il PDF del foglio gara: nome del file e contenuto */
export async function creaFoglioGara(d: DatiFoglioGara) {
  const pagine = await pagineFoglioGara(d);
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  pagine.forEach((c, i) => { if (i) doc.addPage(); doc.addImage(c.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 297, 210); });
  const s = d.foglio;
  const nome = [s.date ? fmtData(s.date).replace(/\//g, '_') : '', s.opponent ? s.opponent.replace(/[^\w]+/g, '_').toUpperCase() : '', 'FOGLIO_GARA'].filter(Boolean).join('_') + '.pdf';
  return { nome, blob: doc.output('blob') };
}
