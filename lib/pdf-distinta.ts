// Distinta (Modulistica → Distinta nell'app): stessa impaginazione di pdfDistinta() che era in public/portale/js/modulistica.js.
// Una pagina sola se basta stringere un po' le righe; staff, note e firme restano sempre insieme.
import type { jsPDF } from 'jspdf';
import { BLU_RGB, GRIGIO_RGB, INK_RGB, LARGH, PAG, carattere, intestazionePdf, nomeFile, nuovaPagina, perPdf, piePdf, riga1 } from '@/lib/pdf-moduli';
import { fmtData } from '@/lib/programma';
import type { Distinta } from '@/lib/distinta';

/** Impagina la distinta: `giocatori` = i soli scelti, col nome; restituisce il nome del file */
export async function impaginaDistinta(doc: jsPDF, d: Distinta, giocatori: { nome: string; numero?: string; nascita?: string; tessera?: string }[], categoria: string) {
  const TITOLO = `DISTINTA · ${d.tipo.toUpperCase()}`;
  let y = await intestazionePdf(doc, TITOLO, d.manifestazione, categoria);
  /* Campi in alto: etichetta piccola, valore che si adatta alla sua riga */
  const campo = (l: string, v: string, x: number, w: number) => {
    doc.setTextColor(...GRIGIO_RGB); riga1(doc, l.toUpperCase(), x, y, w, { size: 7.5, bold: true });
    doc.setTextColor(...INK_RGB); riga1(doc, v || '', x, y + 5.5, w, { size: 11, min: 7.5 }); doc.setDrawColor(200); doc.line(x, y + 7, x + w, y + 7);
  };
  campo('Manifestazione', d.manifestazione, PAG.sx, 120); campo('Data', d.data ? fmtData(d.data) : '', 140, PAG.dx - 140); y += 13;
  campo('Luogo', d.luogo, PAG.sx, 120); campo('Società', 'Academy Casatese Merate', 140, PAG.dx - 140); y += 14;

  const gg = giocatori.slice().sort((a, b) => (+(a.numero ?? '') || 99) - (+(b.numero ?? '') || 99));
  const staff = d.staff.length ? d.staff : [{ ruolo: 'Allenatore', nome: '', documento: '' }, { ruolo: 'Dirigente accompagnatore', nome: '', documento: '' }];
  /* Spazio per staff, note e firme, che restano insieme dopo la tabella */
  carattere(doc, 9, false);
  const note: string[] = d.note ? (doc.splitTextToSize(perPdf('Note: ' + d.note), LARGH) as string[]).slice(0, 6) : [];
  const coda = 10 + staff.length * 7.5 + (note.length ? note.length * 4.2 + 5 : 0) + 24;
  /* Righe: i giocatori scelti e poi vuote fino a 20 (a penna). Stanno su una pagina se basta stringerle un po' */
  const righe = Math.max(gg.length, 20), testataH = 7;
  const spazio = PAG.basso - y - testataH - coda;
  const h = Math.max(6, Math.min(7.4, (spazio - 1.5) / righe));   // 1,5 mm di margine per gli arrotondamenti
  const cols: [number, number, string][] = [[PAG.sx, 13, 'N°'], [PAG.sx + 13, 89, 'Cognome e nome'], [PAG.sx + 102, 34, 'Data di nascita'], [PAG.sx + 136, LARGH - 136, 'N° tessera']];
  const testata = () => {
    doc.setFillColor(...BLU_RGB); doc.rect(PAG.sx, y, LARGH, testataH, 'F'); doc.setTextColor(255);
    cols.forEach(([x, w, l]) => riga1(doc, l, x + 2, y + 4.8, w - 4, { size: 9, bold: true })); y += testataH; doc.setTextColor(...INK_RGB);
  };
  testata();
  const dim = Math.min(10, h * 1.45);   // carattere delle righe, in proporzione all'altezza
  for (let i = 0; i < righe; i++) {
    if (y + h > PAG.basso) { y = nuovaPagina(doc, TITOLO); testata(); }
    const g = gg[i] ?? { nome: '' };
    if (i % 2) { doc.setFillColor(245, 247, 250); doc.rect(PAG.sx, y, LARGH, h, 'F'); }
    doc.setDrawColor(216, 223, 232); cols.forEach(([x, w]) => doc.rect(x, y, w, h));
    const by = y + h / 2 + dim * 0.13;
    riga1(doc, String(g.numero || ''), cols[0][0], by, cols[0][1], { size: dim, bold: true, align: 'center' });
    riga1(doc, g.nome || '', cols[1][0] + 2, by, cols[1][1] - 4, { size: dim, min: 6.5 });
    riga1(doc, g.nascita ? fmtData(g.nascita) : '', cols[2][0] + 2, by, cols[2][1] - 4, { size: dim });
    riga1(doc, g.tessera || '', cols[3][0] + 2, by, cols[3][1] - 4, { size: dim, min: 6.5 });
    y += h;
  }
  /* Staff, note e firme insieme: se non ci stanno, tutti nella pagina dopo */
  if (y + coda > PAG.basso) y = nuovaPagina(doc, TITOLO); else y += 6;
  riga1(doc, 'ALLENATORE E DIRIGENTI', PAG.sx, y, LARGH, { size: 10, bold: true }); y += 3;
  staff.forEach((st) => {
    y += 7.5;
    riga1(doc, `${st.ruolo || ''}:`, PAG.sx, y, 44, { size: 9.5, min: 7 });
    riga1(doc, st.nome || '', PAG.sx + 46, y, 70, { size: 9.5, min: 7 });
    riga1(doc, st.documento ? 'Doc. ' + st.documento : '', PAG.sx + 120, y, LARGH - 120, { size: 9.5, min: 7 });
    doc.setDrawColor(200); doc.line(PAG.sx + 46, y + 1.5, PAG.dx, y + 1.5);
  });
  if (note.length) { y += 8; carattere(doc, 9, false); note.forEach((r) => { doc.text(r, PAG.sx, y); y += 4.2; }); }
  y = Math.max(y + 10, PAG.basso - 16);
  doc.setTextColor(...GRIGIO_RGB);
  riga1(doc, 'Firma del dirigente accompagnatore', PAG.sx, y, 80, { size: 9 });
  riga1(doc, "Firma dell'arbitro / organizzazione", PAG.dx - 80, y, 80, { size: 9 });
  doc.setDrawColor(150); doc.line(PAG.sx, y + 12, PAG.sx + 80, y + 12); doc.line(PAG.dx - 80, y + 12, PAG.dx, y + 12);
  doc.setTextColor(...INK_RGB);
  piePdf(doc);
  return nomeFile('DISTINTA', categoria, d.manifestazione || d.tipo, d.data);
}
