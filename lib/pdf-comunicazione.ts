// Comunicazione su carta intestata (Modulistica → Comunicazione nell'app): stessa impaginazione di pdfComunicazione() in
// public/portale/js/modulistica.js, che resta nel Portale per Calendario → Avvisi ("Scarica PDF").
import type { jsPDF } from 'jspdf';
import {
  BLU_RGB, GRIGIO_RGB, INK_RGB, LARGH, PAG, altezzaParagrafi, blocco, carattere, intestazionePdf, misuraBlocco, nomeFile,
  nuovaPagina, paragrafi, perPdf, piePdf, riga1, rigaGiustificata,
} from '@/lib/pdf-moduli';
import { fmtData } from '@/lib/programma';

export type Comunicazione = { titolo: string; testo: string; autore: string; categoria: string; data: string };

/** Impagina la comunicazione nel documento: la grandezza del testo è la più grande (da 12,5 a 9) con cui titolo, testo e
 *  firma stanno in una pagina; se non ci stanno nemmeno a 9, carattere comodo (11) e più pagine */
export async function impaginaComunicazione(doc: jsPDF, a: Comunicazione) {
  let y = await intestazionePdf(doc, 'COMUNICAZIONE', `Merate, ${fmtData(a.data)}`, a.categoria);
  y += 2;
  const titolo = perPdf(a.titolo).trim();
  const firmaH = 22, spazioParagrafo = 2.6;
  const prova = (size: number) => {
    const tit = titolo ? misuraBlocco(doc, titolo, LARGH, { size: Math.min(16, size + 3.5), min: 12, bold: true, maxRighe: 3 }) : null;
    const pp = paragrafi(doc, a.testo || '', LARGH, size);
    return { tit, pp, tot: (tit ? tit.righe.length * tit.alt + 4 : 0) + altezzaParagrafi(pp, spazioParagrafo) + firmaH };
  };
  let size = 12.5, m = prova(size);
  while (y + m.tot > PAG.basso && size > 9) { size -= 0.5; m = prova(size); }
  if (y + m.tot > PAG.basso) { size = 11; m = prova(size); }
  const { tit, pp } = m;
  if (tit) { doc.setTextColor(...BLU_RGB); carattere(doc, tit.size, true); tit.righe.forEach((r) => { doc.text(r, PAG.sx, y); y += tit.alt; }); y += 4; }
  doc.setTextColor(...INK_RGB);
  for (const par of pp) {
    /* niente righe orfane: se del paragrafo ne starebbe una sola in fondo alla pagina, si parte dalla pagina dopo */
    const restano = Math.floor((PAG.basso - y) / par.alt);
    if (restano < Math.min(2, par.righe.length)) y = nuovaPagina(doc, 'COMUNICAZIONE');
    carattere(doc, size, false);
    for (const r of par.righe) {
      if (y > PAG.basso) { y = nuovaPagina(doc, 'COMUNICAZIONE'); carattere(doc, size, false); }
      if (r.punto) doc.text(r.punto, PAG.sx + r.rientro - 1.6, y, { align: 'right' });   // numero o pallino allineato a destra nel rientro
      if (r.ultima) doc.text(r.t, PAG.sx + r.rientro, y); else rigaGiustificata(doc, r.t, PAG.sx + r.rientro, y, LARGH - r.rientro);
      y += par.alt;
    }
    y += spazioParagrafo;
  }
  /* Firma: sempre insieme, in basso a destra */
  if (y + firmaH - 6 > PAG.basso) y = nuovaPagina(doc, 'COMUNICAZIONE'); else y += 8;
  riga1(doc, 'Academy Casatese Merate', PAG.sx, y, LARGH, { size: 10.5, bold: true, align: 'right' });
  doc.setTextColor(...GRIGIO_RGB); blocco(doc, a.autore || 'La società', PAG.dx - 90, y + 5, 90, { size: 9.5, min: 8, maxRighe: 2, align: 'right' });
  doc.setTextColor(...INK_RGB);
  piePdf(doc);
  return nomeFile('COMUNICAZIONE', titolo, a.data);
}
