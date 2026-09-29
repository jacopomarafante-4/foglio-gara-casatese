// PDF di testo della Modulistica nell'app (solo nel browser, jsPDF, A4 verticale): stesse regole di impaginazione di
// public/portale/js/modulistica.js, finché le altre schede restano nel Portale. Ogni testo si adatta allo spazio che ha:
// una riga prima rimpicciolisce il carattere fino a un minimo e solo dopo si accorcia con "…"; un blocco rimpicciolisce
// finché sta nelle righe concesse. In cima l'intestazione di tutti i documenti (come intestazioneSocieta() in pdf.js).
import type { jsPDF } from 'jspdf';

export const BLU_RGB: [number, number, number] = [0, 61, 165];
export const INK_RGB: [number, number, number] = [14, 26, 43];
export const GRIGIO_RGB: [number, number, number] = [91, 107, 128];
export const PAG = { sx: 12, dx: 198, alto: 16, basso: 280 };   // area utile (il piè di pagina è a 290)
export const LARGH = PAG.dx - PAG.sx;
const INK = '#15202B';

/** I caratteri del PDF (Helvetica) non hanno emoji né simboli fuori dall'alfabeto latino: si tolgono */
export const perPdf = (t: unknown) => String(t ?? '').replace(/[^\x00-\xFF€–—‘’“”…•]/g, '').replace(/[ \t]+$/gm, '');
export const carattere = (doc: jsPDF, size: number, bold?: boolean) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };

type OpzRiga = { size?: number; min?: number; bold?: boolean; align?: 'left' | 'right' | 'center' };
/** Una riga in larghezza w: carattere da `size` fino a `min`, poi "…". Restituisce la grandezza usata */
export function riga1(doc: jsPDF, testo: unknown, x: number, y: number, w: number, { size = 10, min = 7, bold = false, align = 'left' }: OpzRiga = {}) {
  let t = perPdf(testo).replace(/\s+/g, ' ').trim(), s = size;
  carattere(doc, s, bold);
  while (s > min && doc.getTextWidth(t) > w) { s = Math.max(min, s - 0.25); doc.setFontSize(s); }
  if (doc.getTextWidth(t) > w) { while (t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
  doc.text(t, align === 'right' ? x + w : align === 'center' ? x + w / 2 : x, y, { align });
  return s;
}

type OpzBlocco = { size?: number; min?: number; bold?: boolean; maxRighe?: number; align?: 'left' | 'right' };
/** Blocco in larghezza w e al massimo maxRighe: rimpicciolisce finché ci sta (l'ultima riga, se serve, finisce con "…") */
export function misuraBlocco(doc: jsPDF, testo: unknown, w: number, { size = 10, min = 7.5, bold = false, maxRighe = 2 }: OpzBlocco = {}) {
  const t = perPdf(testo).replace(/\s+/g, ' ').trim();
  let s = size, righe: string[];
  for (;;) { carattere(doc, s, bold); righe = doc.splitTextToSize(t, w); if (righe.length <= maxRighe || s <= min) break; s = Math.max(min, s - 0.25); }
  if (righe.length > maxRighe) {
    righe = righe.slice(0, maxRighe); let u = righe[maxRighe - 1];
    while (u.length > 1 && doc.getTextWidth(u + '…') > w) u = u.slice(0, -1);
    righe[maxRighe - 1] = u.trimEnd() + '…';
  }
  return { righe, size: s, alt: s * 0.3528 * 1.25 };   // alt = interlinea in mm
}
export function blocco(doc: jsPDF, testo: unknown, x: number, y: number, w: number, opz: OpzBlocco = {}) {
  const b = misuraBlocco(doc, testo, w, opz);
  carattere(doc, b.size, opz.bold);
  b.righe.forEach((r, i) => doc.text(r, opz.align === 'right' ? x + w : x, y + i * b.alt, { align: opz.align || 'left' }));
  return b.righe.length * b.alt;
}

/** Riga giustificata a mano (jsPDF non giustifica una riga sola): spazi distribuiti tra le parole */
export function rigaGiustificata(doc: jsPDF, r: string, x: number, y: number, w: number) {
  const parole = r.trim().split(/\s+/);
  if (parole.length < 2) { doc.text(r, x, y); return; }
  const pieno = parole.reduce((n, p) => n + doc.getTextWidth(p), 0), spazio = (w - pieno) / (parole.length - 1);
  if (spazio > doc.getTextWidth(' ') * 3) { doc.text(r, x, y); return; }   // troppo vuoto: meglio a bandiera
  let cx = x; parole.forEach((p) => { doc.text(p, cx, y); cx += doc.getTextWidth(p) + spazio; });
}

export type Paragrafo = { righe: { t: string; rientro: number; punto: string; ultima: boolean }[]; alt: number };
/** Testo lungo diviso in paragrafi (riga vuota) e righe; "- ", "• ", "* " o "1." = voce di elenco rientrata */
export function paragrafi(doc: jsPDF, testo: string, w: number, size: number): Paragrafo[] {
  carattere(doc, size, false);
  const alt = size * 0.3528 * 1.45, out: Paragrafo[] = [];
  /* rientro dei numeri uguale per tutto l'elenco, largo quanto il numero più lungo ("10." più di "1.") */
  const numeri = [...perPdf(testo).matchAll(/^\s*(\d+[.)])\s+/gm)].map((m) => doc.getTextWidth(m[1]));
  const rientroNum = Math.max(5, ...numeri.map((n) => n + 2.2));
  perPdf(testo).split(/\n\s*\n/).forEach((par) => {
    const righe: Paragrafo['righe'] = [];
    par.split('\n').filter((r) => r.trim()).forEach((r) => {
      const el = r.match(/^\s*([-•*]|\d+[.)])\s+(.*)$/);
      const rientro = !el ? 0 : /\d/.test(el[1]) ? rientroNum : 5, testoR = el ? el[2] : r.trim();
      (doc.splitTextToSize(testoR, w - rientro) as string[]).forEach((t, k, tutte) =>
        righe.push({ t, rientro, punto: el && k === 0 ? (/\d/.test(el[1]) ? el[1] : '•') : '', ultima: k === tutte.length - 1 }));
    });
    if (righe.length) out.push({ righe, alt });
  });
  return out;
}
export const altezzaParagrafi = (pp: Paragrafo[], dopo: number) => pp.reduce((h, p) => h + p.righe.length * p.alt + dopo, 0);

/** Pagina seguente: fondo bianco, riga con società e titolo del modulo e un filo blu sotto */
export function nuovaPagina(doc: jsPDF, titolo: string) {
  doc.addPage();
  doc.setTextColor(...GRIGIO_RGB); riga1(doc, `ACADEMY CASATESE MERATE · ${titolo} (segue)`, PAG.sx, 10, LARGH, { size: 8.5, bold: true });
  doc.setDrawColor(...BLU_RGB); doc.setLineWidth(0.4); doc.line(PAG.sx, 12.5, PAG.dx, 12.5);
  doc.setTextColor(...INK_RGB);
  return PAG.alto + 2;
}

function caricaImmagine(src: string) {
  return new Promise<HTMLImageElement | null>((ok) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => ok(null);
    img.src = src;
  });
}

/** Intestazione della società come immagine larga 800 e alta 126 (FIGC-SGS, ACADEMY / CASATESE MERATE / categoria,
 *  stemma): come immagineIntestazione() del Portale. I caratteri Barlow li carica la pagina (@fontsource) */
export async function immagineIntestazione(categoria = '') {
  const [logo, figc] = await Promise.all([caricaImmagine('/portale/casatese-logo.png'), caricaImmagine('/portale/figc-sgs-logo.png')]);
  await Promise.all(['700 21px Barlow', '700 26px Barlow', '700 30px Barlow'].map((f) => document.fonts.load(f).catch(() => null)));
  const PW = 800, PH = 126, PK = 3, mx = 40, y = 30, hh = 96, lw = 200, rw = 88;
  const c = document.createElement('canvas');
  c.width = PW * PK; c.height = PH * PK;
  const x = c.getContext('2d')!;
  x.scale(PK, PK); x.fillStyle = '#fff'; x.fillRect(0, 0, PW, PH);
  if (figc) { const fh = (lw * figc.height) / figc.width; x.drawImage(figc, mx, y + (hh - fh) / 2, lw, fh); }
  if (logo) x.drawImage(logo, PW - mx - rw, y + (hh - rw) / 2, rw, rw);
  const cx = (mx + lw + PW - mx - rw) / 2, cmax = PW - 2 * mx - lw - rw - 16;
  const testo = (s: string, py: number, size: number) => {
    let sz = size;
    x.font = `700 ${sz}px "Barlow",Arial,sans-serif`;
    while (x.measureText(s).width > cmax && sz > 8) { sz -= 0.5; x.font = `700 ${sz}px "Barlow",Arial,sans-serif`; }
    x.fillStyle = INK; x.textAlign = 'center'; x.textBaseline = 'alphabetic'; x.fillText(s, cx, py);
  };
  testo('ACADEMY', y + (categoria ? 28 : 38), 26);
  testo('CASATESE MERATE', y + (categoria ? 60 : 72), 30);
  if (categoria) testo(categoria.toUpperCase(), y + 88, 21);
  return { dataUrl: c.toDataURL('image/png'), larghezza: c.width, altezza: c.height };
}

/** Intestazione del modulo: quella della società, un filo blu e la riga con il tipo di documento a sinistra e i dati a
 *  destra. Restituisce la y da cui continuare */
export async function intestazionePdf(doc: jsPDF, titolo: string, destra: string, categoria = '') {
  let y: number;
  try {
    const img = await immagineIntestazione(categoria), hMm = (210 * img.altezza) / img.larghezza;
    doc.addImage(img.dataUrl, 'PNG', 0, 0, 210, hMm); y = hMm + 2;
  } catch {
    doc.setTextColor(...INK_RGB);
    riga1(doc, 'ACADEMY', PAG.sx, 14, LARGH, { size: 16, bold: true, align: 'center' });
    riga1(doc, 'CASATESE MERATE', PAG.sx, 21, LARGH, { size: 18, bold: true, align: 'center' });
    if (categoria) riga1(doc, categoria.toUpperCase(), PAG.sx, 27.5, LARGH, { size: 12, bold: true, align: 'center' });
    y = 33;
  }
  doc.setDrawColor(...BLU_RGB); doc.setLineWidth(0.6); doc.line(PAG.sx, y, PAG.dx, y); y += 7;
  doc.setTextColor(...BLU_RGB); const s = riga1(doc, titolo, PAG.sx, y, 95, { size: 13, min: 9, bold: true });
  const occupato = (doc.getTextWidth(perPdf(titolo)) * s) / doc.getFontSize() + 6;
  if (destra) { doc.setTextColor(...GRIGIO_RGB); riga1(doc, destra, PAG.sx + Math.min(occupato, 100), y, LARGH - Math.min(occupato, 100), { size: 10, min: 7, align: 'right' }); }
  doc.setTextColor(...INK_RGB);
  return y + 9;
}

/** Piè di pagina su tutte le pagine: società, sito e numero di pagina */
export function piePdf(doc: jsPDF) {
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIGIO_RGB);
    doc.text('Academy Casatese Merate · academy-casatese.vercel.app', 10, 290); doc.text(`${i} / ${n}`, 200, 290, { align: 'right' });
  }
}

export const nomeFile = (...parti: (string | null | undefined)[]) =>
  parti.filter(Boolean).join('_').replace(/[^\w]+/g, '_').replace(/_+/g, '_').toUpperCase() + '.pdf';

/** Scarica il file dal browser */
export function scarica(nome: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Blob → base64 (per l'archivio) */
export function inBase64(blob: Blob) {
  return new Promise<string>((ok, ko) => {
    const r = new FileReader();
    r.onload = () => ok(String(r.result).split(',')[1]);
    r.onerror = ko;
    r.readAsDataURL(blob);
  });
}
