/* Portale · PDF della comunicazione su carta intestata per Calendario → Avvisi ("Scarica PDF"). L'area Modulistica
   (distinta, programma gare, comunicazione) è nell'app dalla tappa 3: /modulistica/…, stessa impaginazione in lib/pdf-moduli.ts. PDF testuali con jsPDF (A4 verticale), intestazione della società. */

const BLU_RGB = [0, 61, 165], INK_RGB = [14, 26, 43], GRIGIO_RGB = [91, 107, 128];
/* ---------- Impaginazione automatica (comune a tutti i moduli) ----------
   Ogni testo si adatta allo spazio che ha: una riga (cella, campo) prima rimpicciolisce il carattere fino a un minimo e
   solo dopo si accorcia con "…"; un blocco (titolo, sottotitolo, cella su più righe) rimpicciolisce finché sta nelle righe
   concesse; il testo lungo va a capo per paragrafi, con elenchi rientrati, righe giustificate e salti pagina puliti. */
const PAG = {sx:12, dx:198, alto:16, basso:280};   // area utile (il piè di pagina è a 290)
const LARGH = PAG.dx - PAG.sx;
/* I caratteri del PDF (Helvetica) non hanno emoji né simboli fuori dall'alfabeto latino: si tolgono */
const perPdf = t => String(t ?? '').replace(/[^\x00-\xFF€–—‘’“”…•]/g, '').replace(/[ \t]+$/gm, '');
const carattere = (doc, size, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); doc.setFontSize(size); };
/* Una riga in larghezza w: carattere da `size` fino a `min`, poi "…". Restituisce la grandezza usata */
function riga1(doc, testo, x, y, w, {size = 10, min = 7, bold = false, align = 'left'} = {}){
  let t = perPdf(testo).replace(/\s+/g, ' ').trim(), s = size;
  carattere(doc, s, bold);
  while(s > min && doc.getTextWidth(t) > w){ s = Math.max(min, s - 0.25); doc.setFontSize(s); }
  if(doc.getTextWidth(t) > w){ while(t.length > 1 && doc.getTextWidth(t + '…') > w) t = t.slice(0, -1); t = t.trimEnd() + '…'; }
  doc.text(t, align === 'right' ? x + w : align === 'center' ? x + w / 2 : x, y, {align});
  return s;
}
/* Blocco in larghezza w e al massimo maxRighe: rimpicciolisce finché ci sta (l'ultima riga, se serve, finisce con "…") */
function misuraBlocco(doc, testo, w, {size = 10, min = 7.5, bold = false, maxRighe = 2} = {}){
  const t = perPdf(testo).replace(/\s+/g, ' ').trim();
  let s = size, righe;
  for(;;){ carattere(doc, s, bold); righe = doc.splitTextToSize(t, w); if(righe.length <= maxRighe || s <= min) break; s = Math.max(min, s - 0.25); }
  if(righe.length > maxRighe){ righe = righe.slice(0, maxRighe); let u = righe[maxRighe - 1];
    while(u.length > 1 && doc.getTextWidth(u + '…') > w) u = u.slice(0, -1); righe[maxRighe - 1] = u.trimEnd() + '…'; }
  return {righe, size: s, alt: s * 0.3528 * 1.25};   // alt = interlinea in mm
}
function blocco(doc, testo, x, y, w, opz = {}){
  const b = misuraBlocco(doc, testo, w, opz);
  carattere(doc, b.size, opz.bold);
  b.righe.forEach((r, i) => doc.text(r, opz.align === 'right' ? x + w : x, y + i * b.alt, {align: opz.align || 'left'}));
  return b.righe.length * b.alt;
}
/* Riga giustificata a mano (jsPDF non giustifica una riga sola): spazi distribuiti tra le parole */
function rigaGiustificata(doc, r, x, y, w){
  const parole = r.trim().split(/\s+/);
  if(parole.length < 2){ doc.text(r, x, y); return; }
  const pieno = parole.reduce((n, p) => n + doc.getTextWidth(p), 0), spazio = (w - pieno) / (parole.length - 1);
  if(spazio > doc.getTextWidth(' ') * 3){ doc.text(r, x, y); return; }   // troppo vuoto: meglio a bandiera
  let cx = x; parole.forEach(p => { doc.text(p, cx, y); cx += doc.getTextWidth(p) + spazio; });
}
/* Testo lungo diviso in paragrafi (riga vuota) e righe; "- ", "• ", "* " o "1." = voce di elenco rientrata */
function paragrafi(doc, testo, w, size){
  carattere(doc, size, false);
  const alt = size * 0.3528 * 1.45, out = [];
  /* rientro dei numeri uguale per tutto l'elenco, largo quanto il numero più lungo ("10." più di "1.") */
  const numeri = [...perPdf(testo).matchAll(/^\s*(\d+[.)])\s+/gm)].map(m => doc.getTextWidth(m[1]));
  const rientroNum = Math.max(5, ...numeri.map(w => w + 2.2));
  perPdf(testo).split(/\n\s*\n/).forEach(par => {
    const righe = [];
    par.split('\n').filter(r => r.trim()).forEach(r => {
      const el = r.match(/^\s*([-•*]|\d+[.)])\s+(.*)$/);
      const rientro = !el ? 0 : /\d/.test(el[1]) ? rientroNum : 5, testoR = el ? el[2] : r.trim();
      doc.splitTextToSize(testoR, w - rientro).forEach((t, k, tutte) =>
        righe.push({t, rientro, punto: el && k === 0 ? (/\d/.test(el[1]) ? el[1] : '•') : '', ultima: k === tutte.length - 1}));
    });
    if(righe.length) out.push({righe, alt});
  });
  return out;
}
const altezzaParagrafi = (pp, dopo) => pp.reduce((h, p) => h + p.righe.length * p.alt + dopo, 0);
/* Pagina seguente: fondo bianco, riga con società e titolo del modulo e un filo blu sotto */
function nuovaPagina(doc, titolo){
  doc.addPage();
  doc.setTextColor(...GRIGIO_RGB); riga1(doc, `ACADEMY CASATESE MERATE · ${titolo} (segue)`, PAG.sx, 10, LARGH, {size: 8.5, bold: true});
  doc.setDrawColor(...BLU_RGB); doc.setLineWidth(0.4); doc.line(PAG.sx, 12.5, PAG.dx, 12.5);
  doc.setTextColor(...INK_RGB);
  return PAG.alto + 2;
}

/* Intestazione di tutti i documenti: la stessa della convocazione (fondo bianco: FIGC-SGS, ACADEMY / CASATESE MERATE /
   categoria, stemma), poi un filo blu e la riga con il tipo di documento a sinistra e i dati a destra.
   Restituisce la y da cui continuare. */
async function intestazionePdf(doc, titolo, destra, categoria = ''){
  let y;
  try{
    const [logo, figc] = await Promise.all([loadLogo(), loadImg('figc-sgs-logo.png')]); await ensureFonts();
    const img = immagineIntestazione(logo, figc, categoria), hMm = 210 * img.height / img.width;
    doc.addImage(img.toDataURL('image/png'), 'PNG', 0, 0, 210, hMm); y = hMm + 2;
  }catch(e){
    /* pagina aperta come file (stemmi non copiabili): la stessa intestazione, solo testo */
    doc.setTextColor(...INK_RGB);
    riga1(doc, 'ACADEMY', PAG.sx, 14, LARGH, {size: 16, bold: true, align: 'center'});
    riga1(doc, 'CASATESE MERATE', PAG.sx, 21, LARGH, {size: 18, bold: true, align: 'center'});
    if(categoria) riga1(doc, categoria.toUpperCase(), PAG.sx, 27.5, LARGH, {size: 12, bold: true, align: 'center'});
    y = 33;
  }
  doc.setDrawColor(...BLU_RGB); doc.setLineWidth(0.6); doc.line(PAG.sx, y, PAG.dx, y); y += 7;
  doc.setTextColor(...BLU_RGB); const s = riga1(doc, titolo, PAG.sx, y, 95, {size: 13, min: 9, bold: true});
  const occupato = doc.getTextWidth(perPdf(titolo)) * s / doc.getFontSize() + 6;
  if(destra){ doc.setTextColor(...GRIGIO_RGB); riga1(doc, destra, PAG.sx + Math.min(occupato, 100), y, LARGH - Math.min(occupato, 100), {size: 10, min: 7, align: 'right'}); }
  doc.setTextColor(...INK_RGB);
  return y + 9;
}
function piePdf(doc){
  const n = doc.getNumberOfPages();
  for(let i = 1; i <= n; i++){ doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIGIO_RGB);
    doc.text('Academy Casatese Merate · academy-casatese.vercel.app', 10, 290); doc.text(`${i} / ${n}`, 200, 290, {align:'right'}); }
}
async function salvaPdf(doc, nome, tipo){
  piePdf(doc);
  try{ await consegnaPdf(nome, doc.output('blob'), tipo); setStatus('PDF pronto'); }
  catch(e){ setStatus('Download non riuscito'); }
}
const nomeFile = (...parti) => parti.filter(Boolean).join('_').replace(/[^\w]+/g, '_').replace(/_+/g, '_').toUpperCase() + '.pdf';

/* ---------- Comunicazione su carta intestata (dagli Avvisi) ---------- */
async function pdfComunicazione(a){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  const doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
  /* categoria nell'intestazione: quella scelta (Modulistica) o, dagli Avvisi, la squadra se è una sola */
  const categoria = a.mostraCat === false ? '' : (a.categoria ?? ((a.squadre||[]).length === 1 ? (S.teams.find(t => t.id === a.squadre[0])?.category || '') : ''));
  let y = await intestazionePdf(doc, 'COMUNICAZIONE', `Merate, ${a.data ? fmtDate(a.data) : fmtDate(todayISO())}`, categoria);
  y += 2;
  const titolo = perPdf(a.titolo).trim();
  /* Grandezza del testo: la più grande (da 12,5 a 9) con cui titolo, testo e firma stanno in una pagina. Se non ci stanno
     nemmeno a 9 il testo è davvero lungo: carattere comodo (11) e più pagine */
  const firmaH = 22, spazioParagrafo = 2.6;
  const prova = size => {
    const tit = titolo ? misuraBlocco(doc, titolo, LARGH, {size: Math.min(16, size + 3.5), min: 12, bold: true, maxRighe: 3}) : null;
    const pp = paragrafi(doc, a.testo || '', LARGH, size);
    return {tit, pp, tot: (tit ? tit.righe.length * tit.alt + 4 : 0) + altezzaParagrafi(pp, spazioParagrafo) + firmaH};
  };
  let size = 12.5, m = prova(size);
  while(y + m.tot > PAG.basso && size > 9){ size -= 0.5; m = prova(size); }
  if(y + m.tot > PAG.basso){ size = 11; m = prova(size); }
  const {tit, pp} = m;
  if(tit){ doc.setTextColor(...BLU_RGB); carattere(doc, tit.size, true); tit.righe.forEach(r => { doc.text(r, PAG.sx, y); y += tit.alt; }); y += 4; }
  doc.setTextColor(...INK_RGB);
  for(const par of pp){
    /* niente righe orfane: se del paragrafo ne starebbe una sola in fondo alla pagina, si parte dalla pagina dopo */
    const restano = Math.floor((PAG.basso - y) / par.alt);
    if(restano < Math.min(2, par.righe.length)) y = nuovaPagina(doc, 'COMUNICAZIONE');
    carattere(doc, size, false);
    for(const r of par.righe){
      if(y > PAG.basso){ y = nuovaPagina(doc, 'COMUNICAZIONE'); carattere(doc, size, false); }
      if(r.punto) doc.text(r.punto, PAG.sx + r.rientro - 1.6, y, {align: 'right'});   // numero o pallino allineato a destra nel rientro
      if(r.ultima) doc.text(r.t, PAG.sx + r.rientro, y); else rigaGiustificata(doc, r.t, PAG.sx + r.rientro, y, LARGH - r.rientro);
      y += par.alt;
    }
    y += spazioParagrafo;
  }
  /* Firma: sempre insieme, in basso a destra */
  if(y + firmaH - 6 > PAG.basso) y = nuovaPagina(doc, 'COMUNICAZIONE'); else y += 8;
  riga1(doc, 'Academy Casatese Merate', PAG.sx, y, LARGH, {size: 10.5, bold: true, align: 'right'});
  doc.setTextColor(...GRIGIO_RGB); blocco(doc, a.autore || 'La società', PAG.dx - 90, y + 5, 90, {size: 9.5, min: 8, maxRighe: 2, align: 'right'});
  doc.setTextColor(...INK_RGB);
  await salvaPdf(doc, nomeFile('COMUNICAZIONE', titolo, a.data), 'Comunicazione');
}

document.addEventListener('click', e => {
  const b = e.target.closest('[data-avpdf],[data-avbozzapdf]'); if(!b) return;
  if(b.dataset.avpdf){ const a = avvisiSoc.find(x => x.id === b.dataset.avpdf); if(a) pdfComunicazione(a); return; }
  if(b.dataset.avbozzapdf){ pdfComunicazione({...bozzaAvviso, data: todayISO(), autore: misterName || 'La società'}); }
});
