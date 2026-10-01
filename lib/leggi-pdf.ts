// Testo di un PDF con la posizione di ogni parola (per lib/calendario-pdf.ts). unpdf = pdf.js senza worker: funziona sul server
// (azione dell'app) e nelle prove. I pezzi di testo del PDF si dividono in parole; la x di ogni parola si stima in proporzione
// alle lettere del pezzo (basta per colonne e trattini). Le linee dritte disegnate (bordi delle tabelle) servono a ricostruire le
// celle dell'elenco campi, come faceva pdfplumber.
import { getDocumentProxy } from 'unpdf';
import { OPS } from 'unpdf/pdfjs';
import type { Linea, Pagina, Parola } from '@/lib/calendario-pdf';

type Pezzo = { str: string; transform: number[]; width: number; height: number };
const DISEGNA = new Set([OPS.stroke, OPS.closeStroke, OPS.fill, OPS.eoFill, OPS.fillStroke, OPS.eoFillStroke, OPS.closeFillStroke, OPS.closeEOFillStroke]);

export async function pagineDelPdf(dati: Uint8Array): Promise<Pagina[]> {
  const pdf = await getDocumentProxy(dati);
  const out: Pagina[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const pagina = await pdf.getPage(n);
    const { width, height } = pagina.getViewport({ scale: 1 });
    const { items } = await pagina.getTextContent();
    const parole: Parola[] = [];
    for (const it of items as Pezzo[]) {
      if (!it.str || !it.str.trim()) continue;
      const [, , , dimensione, x, y] = it.transform;
      const top = height - y - (it.height || Math.abs(dimensione));
      const passo = it.width / Math.max(1, it.str.length);
      for (const m of it.str.matchAll(/\S+/g)) {
        const x0 = x + m.index * passo;
        parole.push({ text: m[0], x0, x1: x0 + m[0].length * passo, top });
      }
    }
    // un punto o due punti scritti a parte ("R" ".") si attaccano alla parola prima, come in pdfplumber
    parole.sort((a, b) => a.top - b.top || a.x0 - b.x0);
    for (let i = parole.length - 1; i > 0; i--) {
      const w = parole[i], u = parole[i - 1];
      const attaccata = Math.abs(w.top - u.top) < 1 && w.x0 - u.x1 < 2;
      // anche le date spezzate ("13" "/03/2027")
      if (attaccata && (/^[.:,]+$/.test(w.text) || (/^\//.test(w.text) && /\d$/.test(u.text)) || (/\/$/.test(u.text) && /^\d/.test(w.text)))) {
        u.text += w.text; u.x1 = w.x1; parole.splice(i, 1);
      }
    }
    // righe di testo (per il girone e le tabelle delle delegazioni con "|")
    const righe: string[] = [];
    let attuale: Parola[] = [], topAttuale = -1e9;
    for (const w of parole.slice().sort((a, b) => a.top - b.top || a.x0 - b.x0)) {
      if (Math.abs(w.top - topAttuale) > 2.5) { if (attuale.length) righe.push(attuale.map((p) => p.text).join(' ')); attuale = []; topAttuale = w.top; }
      attuale.push(w);
    }
    if (attuale.length) righe.push(attuale.map((p) => p.text).join(' '));
    // linee dritte lunghe (bordi delle tabelle), dall'alto come le parole; le coordinate seguono le trasformazioni del PDF
    const linee: Linea[] = [];
    const ops = await pagina.getOperatorList();
    type M = [number, number, number, number, number, number];
    let ctm: M = [1, 0, 0, 1, 0, 0];
    const pila: M[] = [];
    const per = (m: M, n: M): M => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
      m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
    const pt = (x: number, y: number): [number, number] => [ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]];
    const segmento = ([ax, ay]: [number, number], [bx, by]: [number, number]) => {
      if (Math.abs(bx - ax) < 1 && Math.abs(by - ay) > 8) linee.push({ verticale: true, a: (ax + bx) / 2, da: height - Math.max(ay, by), fino: height - Math.min(ay, by) });
      else if (Math.abs(by - ay) < 1 && Math.abs(bx - ax) > 20) linee.push({ verticale: false, a: height - (ay + by) / 2, da: Math.min(ax, bx), fino: Math.max(ax, bx) });
    };
    ops.fnArray.forEach((fn, i) => {
      const args = ops.argsArray[i] as unknown[];
      if (fn === OPS.save) pila.push(ctm);
      else if (fn === OPS.restore) ctm = pila.pop() ?? ctm;
      else if (fn === OPS.transform) ctm = per(ctm, args as M);
      else if (fn === OPS.paintFormXObjectBegin && Array.isArray(args[0])) { pila.push(ctm); ctm = per(ctm, args[0] as M); }
      else if (fn === OPS.paintFormXObjectEnd) ctm = pila.pop() ?? ctm;
      else if (fn === OPS.constructPath && DISEGNA.has((args as [number])[0])) {   // solo i tracciati disegnati (non i ritagli invisibili)
        const dati = Array.from((args as [number, ArrayLike<number>[]])[1]?.[0] ?? []);
        let cur: [number, number] = [0, 0], inizio: [number, number] = [0, 0];
        for (let k = 0; k < dati.length;) {
          const op = dati[k];
          if (op === 0) { cur = inizio = pt(dati[k + 1], dati[k + 2]); k += 3; }
          else if (op === 1) { const n = pt(dati[k + 1], dati[k + 2]); segmento(cur, n); cur = n; k += 3; }
          else if (op === 4) { segmento(cur, inizio); cur = inizio; k += 1; }
          else if (op === 2) { cur = pt(dati[k + 5], dati[k + 6]); k += 7; }
          else if (op === 3) { cur = pt(dati[k + 3], dati[k + 4]); k += 5; }
          else break;
        }
      }
    });
    out.push({ width, parole, righe, linee });
  }
  await pdf.cleanup?.();
  return out;
}
