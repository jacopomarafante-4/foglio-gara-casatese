// Foglio PIN delle famiglie (PDF, solo nel browser): biglietti da ritagliare, 8 per pagina, da consegnare a mano
// (niente WhatsApp). In cima a ogni biglietto l'intestazione di tutti i documenti, in piccolo: la stessa di
// intestazioneSocieta() in public/portale/js/pdf.js (FIGC-SGS a sinistra, ACADEMY / CASATESE MERATE, stemma a destra),
// da lib/pdf-moduli.ts.
// Non si archivia (contiene credenziali).

import { immagineIntestazione, scarica } from '@/lib/pdf-moduli';

const SITO = 'academy-casatese.vercel.app';

export type BigliettoPin = { nome: string; categoria: string; pin: string };

/** Crea e scarica il foglio PIN. Restituisce false se non c'è nessun PIN da stampare */
export async function scaricaFogliPin(elenco: BigliettoPin[]) {
  const con = elenco.filter((t) => t.pin);
  if (!con.length) return false;
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const W = 95, H = 66, X = [10, 105], Y = [12, 80, 148, 216];
  let intest: string | null = null;
  try { intest = (await immagineIntestazione()).dataUrl; } catch { /* senza intestazione: solo il nome della società */ }
  con.forEach((t, i) => {
    if (i && i % 8 === 0) doc.addPage();
    const x = X[i % 2], y = Y[Math.floor((i % 8) / 2)];
    doc.setDrawColor(180); doc.setLineDashPattern([1.5, 1.5], 0); doc.rect(x, y, W, H); doc.setLineDashPattern([], 0);
    if (intest) doc.addImage(intest, 'PNG', x + 1, y + 1, W - 2, ((W - 2) * 126) / 800);
    else { doc.setTextColor(14, 26, 43); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('ACADEMY CASATESE MERATE', x + W / 2, y + 9, { align: 'center' }); }
    doc.setDrawColor(0, 61, 165); doc.setLineWidth(0.4); doc.line(x + 4, y + 16.5, x + W - 4, y + 16.5);
    doc.setTextColor(14, 26, 43); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5); doc.text(doc.splitTextToSize(t.nome, W - 8)[0], x + 4, y + 22.5);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(t.categoria, x + 4, y + 27);
    doc.text('1. Aprite ' + SITO, x + 4, y + 33.5);
    doc.text('2. Inserite il PIN:', x + 4, y + 38);
    doc.setFont('courier', 'bold'); doc.setFontSize(22); doc.text(t.pin.replace(/(\d{4})(\d{4})/, '$1 $2'), x + 4, y + 48);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(91, 107, 128);
    doc.text(doc.splitTextToSize('Convocazioni (con "ci sarà / non ci sarà"), calendario, avvisi, iscrizione, quote e documenti. Il PIN è personale: non datelo ad altri.', W - 8), x + 4, y + 56);
  });
  const nome = `PIN_FAMIGLIE_${(con[0].categoria || 'squadra').replace(/[^\w]+/g, '_').toUpperCase()}.pdf`;
  scarica(nome, doc.output('blob'));
  return true;
}
