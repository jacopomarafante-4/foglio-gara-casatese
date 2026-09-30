// Disegno su tela (canvas) per i PDF "a pagina intera" nell'app (report statistiche, convocazione, foglio gara): stessi aiuti di
// public/portale/js/pdf.js (T, wrap, righeTesto, taglia, testoInRiquadro, intestazioneSocieta, drawTable). Solo nel browser.
export const INK = '#15202B', MUTED = '#5B6875', GRASS = '#2F6B45', RED = '#C8102E';
export const LABEL_BG = '#EEF1F4', LINK_C = '#1A56C4', LINE_C = '#D5DDD8';
export const BLU = '#003DA5', BLU_SCURO = '#002A73', ORO = '#D4AF37', ROSSO_CLUB = '#C41E3A', CARTA = '#F3F6FA';

export type Ctx = CanvasRenderingContext2D;
export type OpzT = { size?: number; weight?: number; cond?: boolean; color?: string; align?: CanvasTextAlign; base?: CanvasTextBaseline; max?: number; halo?: number };

export const font = (x: Ctx, size: number, weight = 600, cond = false) => {
  x.font = `${weight} ${size}px ${cond ? '"Barlow Condensed","Arial Narrow",Arial' : '"Barlow",Arial'},sans-serif`;
};
/** Testo: se c'è `max`, la grandezza scende finché ci sta (fino a 8) */
export function T(x: Ctx, s: unknown, px: number, py: number, o: OpzT = {}) {
  font(x, o.size || 14, o.weight || 500, o.cond);
  x.fillStyle = o.color || INK; x.textAlign = o.align || 'left'; x.textBaseline = o.base || 'alphabetic';
  const str = String(s ?? '');
  if (o.max) { let sz = o.size || 14; while (x.measureText(str).width > o.max && sz > 8) { sz -= 0.5; font(x, sz, o.weight || 500, o.cond); } }
  if (o.halo) { x.lineWidth = o.halo; x.strokeStyle = '#fff'; x.lineJoin = 'round'; x.strokeText(str, px, py); }
  x.fillText(str, px, py);
}
/** Righe di un testo in una larghezza (a capo sulle parole e sui \n) */
export function righeTesto(x: Ctx, s: unknown, maxW: number) {
  const out: string[] = [];
  for (const para of String(s || '').split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) { const t = line ? line + ' ' + w : w; if (x.measureText(t).width > maxW && line) { out.push(line); line = w; } else line = t; }
    out.push(line);
  }
  return out;
}
/** Testo su più righe; restituisce quante righe ha usato */
export function wrap(x: Ctx, s: unknown, px: number, py: number, maxW: number, lh: number, o: OpzT = {}, maxLines = 99) {
  font(x, o.size || 14, o.weight || 500, o.cond);
  const righe = righeTesto(x, s, maxW).slice(0, maxLines);
  righe.forEach((r, i) => T(x, r, px, py + i * lh, o));
  return righe.length;
}
/** Una riga lunga al massimo maxW: se non ci sta finisce con "…" */
export function taglia(x: Ctx, s: unknown, maxW: number) {
  let t = String(s || ''); if (x.measureText(t).width <= maxW) return t;
  while (t && x.measureText(t + '…').width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + '…';
}
/** Testo in un riquadro: scende di grandezza fino a `min`; se ancora non ci sta, l'ultima riga finisce con "…" */
export function testoInRiquadro(x: Ctx, s: unknown, px: number, py: number, maxW: number, maxH: number, o: OpzT & { min?: number } = {}) {
  let size = o.size || 15, righe: string[], lh: number;
  for (;;) { font(x, size, o.weight || 500, o.cond); lh = size * 1.33; righe = righeTesto(x, s, maxW); if (righe.length * lh <= maxH || size <= (o.min || 11)) break; size -= 0.5; }
  const n = Math.max(1, Math.floor(maxH / lh));
  if (righe.length > n) { righe = righe.slice(0, n); let u = righe[n - 1]; while (u && x.measureText(u + '…').width > maxW) u = u.slice(0, -1); righe[n - 1] = u.trimEnd() + '…'; }
  righe.forEach((r, i) => T(x, r, px, py + i * lh, { ...o, size }));
  return righe.length * lh;
}
export function rrect(x: Ctx, px: number, py: number, w: number, h: number, r: number) {
  x.beginPath(); if (x.roundRect) x.roundRect(px, py, w, h, r); else x.rect(px, py, w, h);
}
export function striscia(x: Ctx, px: number, py: number, w: number, h: number) {
  x.fillStyle = BLU; x.fillRect(px, py, (w * 6) / 9, h);
  x.fillStyle = ORO; x.fillRect(px + (w * 6) / 9, py, w / 9, h);
  x.fillStyle = ROSSO_CLUB; x.fillRect(px + (w * 7) / 9, py, (w * 2) / 9, h);
}
/** Tela bianca W×H (in punti) a risoluzione K */
export function tela(W: number, H: number, K: number): [HTMLCanvasElement, Ctx] {
  const c = document.createElement('canvas'); c.width = W * K; c.height = H * K;
  const x = c.getContext('2d')!; x.scale(K, K); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H);
  return [c, x];
}

/* ---------- Immagini e caratteri ---------- */
const immagini: Record<string, Promise<HTMLImageElement | null>> = {};
export function caricaImmagine(src: string) {
  return (immagini[src] ??= new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }));
}
export const stemmi = async () => {
  const [logo, figc] = await Promise.all([caricaImmagine('/portale/casatese-logo.png'), caricaImmagine('/portale/figc-sgs-logo.png')]);
  await Promise.all(['700 20px "Barlow Condensed"', '600 20px "Barlow Condensed"', '500 20px "Barlow"', '600 20px "Barlow"', '700 20px "Barlow"']
    .map((f) => document.fonts.load(f).catch(() => null)));
  return { logo, figc };
};

/** Intestazione della società: FIGC-SGS a sinistra, ACADEMY / CASATESE MERATE / categoria al centro, stemma a destra (alta 96) */
export function intestazioneSocieta(x: Ctx, PW: number, mx: number, y: number, logo: HTMLImageElement | null, figc: HTMLImageElement | null, categoria: string) {
  const hh = 96, lw = 200, rw = 88;
  if (figc) { const fh = (lw * figc.height) / figc.width; x.drawImage(figc, mx, y + (hh - fh) / 2, lw, fh); }
  if (logo) x.drawImage(logo, PW - mx - rw, y + (hh - rw) / 2, rw, rw);
  const cx = (mx + lw + PW - mx - rw) / 2, cmax = PW - 2 * mx - lw - rw - 16;
  T(x, 'ACADEMY', cx, y + (categoria ? 28 : 38), { size: 26, weight: 700, align: 'center', max: cmax });
  T(x, 'CASATESE MERATE', cx, y + (categoria ? 60 : 72), { size: 30, weight: 700, align: 'center', max: cmax });
  if (categoria) T(x, categoria.toUpperCase(), cx, y + 88, { size: 21, weight: 700, align: 'center', max: cmax });
  return hh;
}

/** Tabella: cols [{t, w, al}], righe [[...]]; fill/color/bold per cella */
export type Colonna = { t: string; w: number; al?: 'left' | 'center' };
export function tabella(x: Ctx, x0: number, y0: number, cols: Colonna[], righe: unknown[][], o: {
  headH?: number; rh?: number; fs?: number; fill?: (ri: number, ci: number, v: unknown) => string | null;
  color?: (ri: number, ci: number, v: unknown) => string | null; bold?: (ri: number, ci: number) => boolean;
} = {}) {
  const headH = o.headH || 24, rh = o.rh || 22, fs = o.fs || Math.min(12, rh * 0.52);
  const tw = cols.reduce((a, c) => a + c.w, 0);
  x.fillStyle = INK; x.fillRect(x0, y0, tw, headH);
  let cx = x0;
  cols.forEach((c) => { T(x, c.t, c.al === 'left' ? cx + 8 : cx + c.w / 2, y0 + headH / 2 + 1, { size: Math.min(11, headH * 0.45), weight: 700, base: 'middle', align: c.al === 'left' ? 'left' : 'center', color: '#fff', max: c.w - 8 }); cx += c.w; });
  let y = y0 + headH;
  righe.forEach((r, ri) => {
    x.fillStyle = ri % 2 ? '#F7F7F5' : '#fff'; x.fillRect(x0, y, tw, rh);
    cx = x0;
    cols.forEach((c, ci) => {
      const f = o.fill?.(ri, ci, r[ci]);
      if (f) { x.fillStyle = f; x.fillRect(cx + 1, y + 1, c.w - 2, rh - 2); }
      x.strokeStyle = LINE_C; x.lineWidth = 1; x.strokeRect(cx, y, c.w, rh);
      T(x, r[ci] ?? '', c.al === 'left' ? cx + 8 : cx + c.w / 2, y + rh / 2 + 1,
        { size: fs, weight: ci === 0 || o.bold?.(ri, ci) ? 700 : 500, base: 'middle', align: c.al === 'left' ? 'left' : 'center', max: c.w - 8, color: o.color?.(ri, ci, r[ci]) || INK });
      cx += c.w;
    });
    y += rh;
  });
  return y;
}
