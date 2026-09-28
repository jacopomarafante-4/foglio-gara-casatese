/* Portale · Modulistica: distinta compilabile (tornei, amichevoli omologate), comunicazione su carta intestata,
   programma gare di un periodo (dal–al). PDF testuali con jsPDF (A4 verticale), intestazione della società. */

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
/* Pagina seguente: fascia sottile con società e titolo del modulo */
function nuovaPagina(doc, titolo){
  doc.addPage();
  doc.setFillColor(...BLU_RGB); doc.rect(0, 0, 210, 9, 'F'); doc.setFillColor(212, 175, 55); doc.rect(0, 9, 150, 0.8, 'F'); doc.setFillColor(196, 30, 58); doc.rect(150, 9, 60, 0.8, 'F');
  doc.setTextColor(255); riga1(doc, `ACADEMY CASATESE MERATE · ${titolo} (segue)`, PAG.sx, 6, LARGH, {size: 8.5, bold: true});
  doc.setTextColor(...INK_RGB);
  return PAG.alto + 2;
}

/* Intestazione comune: stemma, società, titolo e sottotitolo che si adattano; restituisce la y da cui continuare */
async function intestazionePdf(doc, titolo, sotto){
  const logo = await loadLogo();
  doc.setFillColor(...BLU_RGB); doc.rect(0, 0, 210, 32, 'F');
  doc.setFillColor(212, 175, 55); doc.rect(0, 32, 150, 1.6, 'F'); doc.setFillColor(196, 30, 58); doc.rect(150, 32, 60, 1.6, 'F');
  doc.setFillColor(255, 255, 255); doc.roundedRect(PAG.sx, 5, 22, 22, 2, 2, 'F');
  /* stemma: se il browser non lo lascia copiare (es. pagina aperta come file) il PDF esce lo stesso, senza stemma */
  if(logo) try{ const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight; c.getContext('2d').drawImage(logo, 0, 0);
    doc.addImage(c.toDataURL('image/png'), 'PNG', PAG.sx + 1.5, 6.5, 19, 19); }catch(e){}
  const x = PAG.sx + 28, w = PAG.dx - x;
  doc.setTextColor(255); riga1(doc, 'ACADEMY CASATESE MERATE', x, 10.5, w, {size: 9, bold: true});
  riga1(doc, titolo, x, 18.5, w, {size: 17, min: 11, bold: true});
  if(sotto) blocco(doc, sotto, x, 24, w, {size: 9.5, min: 7.5, maxRighe: 2});
  doc.setTextColor(...INK_RGB);
  return 44;
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

/* ---------- Distinta compilabile (Modulistica → Distinta) ----------
   sheet.distinta = {tipo, manifestazione, data, luogo, giocatori:{pid:{sel, numero, nascita, tessera}}, staff:[{ruolo, nome, documento}], note} */
const TIPI_DISTINTA = ['Torneo', 'Amichevole omologata'];
const RUOLI_STAFF = ['Allenatore', 'Dirigente accompagnatore', 'Preparatore', 'Massaggiatore', 'Medico'];
const distinta = () => (S.sheet.distinta ||= {tipo:'Torneo', manifestazione:'', data:'', luogo:'', giocatori:{}, staff:[{ruolo:'Allenatore', nome:coachNames(TEAM())||'', documento:''},{ruolo:'Dirigente accompagnatore', nome:'', documento:''}], note:''});
function viewDistinta(){
  const d = distinta(), gg = byName();
  const sel = gg.filter(p => d.giocatori[p.id]?.sel).length;
  const campo = (k, l, tipo='text', ph='') => `<div><label class="f">${l}</label><input type="${tipo}" data-dist="${k}" value="${esc(d[k]||'')}" placeholder="${esc(ph)}"></div>`;
  return `<section class="panel">
    <h2>Distinta</h2>
    <p class="hint">Per tornei e amichevoli omologate. Scegli i giocatori e completa i dati; quello che lasci vuoto resta da scrivere a penna sul foglio.</p>
    ${casellaCategoria()}
    <div class="grid">
      <div><label class="f">Tipo</label><select data-dist="tipo">${TIPI_DISTINTA.map(t => `<option ${t===d.tipo?'selected':''}>${t}</option>`).join('')}</select></div>
      ${campo('manifestazione','Manifestazione','text','Es. Torneo di Natale')}${campo('data','Data','date')}${campo('luogo','Luogo','text','Campo, paese')}
    </div>
    <h3 class="convh3" style="margin-top:14px">Giocatori <span class="note">(${sel} scelti)</span></h3>
    <div class="row" style="gap:6px;margin-bottom:6px"><button class="btn small ghost" data-distall="1">Tutti</button><button class="btn small ghost" data-distall="0">Nessuno</button></div>
    <div class="distlist">${gg.map(p => { const g = d.giocatori[p.id] || {};
      return `<div class="distrow ${g.sel ? 'on' : ''}"><label class="row" style="gap:6px"><input type="checkbox" data-distsel="${p.id}" ${g.sel?'checked':''}> <b>${esc(p.name)}</b></label>
        ${g.sel ? `<div class="distcampi"><input data-distg="${p.id}:numero" value="${esc(g.numero||matchNum(p.id)||'')}" placeholder="N°" inputmode="numeric" aria-label="Numero">
          <input type="date" data-distg="${p.id}:nascita" value="${esc(g.nascita||'')}" aria-label="Data di nascita">
          <input data-distg="${p.id}:tessera" value="${esc(g.tessera||'')}" placeholder="N° tessera" aria-label="Tessera"></div>` : ''}</div>`; }).join('')}</div>
    <h3 class="convh3" style="margin-top:14px">Allenatore e dirigenti</h3>
    ${d.staff.map((st, i) => `<div class="qrow" style="grid-template-columns:1.2fr 1.5fr 1.2fr auto">
      <select data-diststaff="${i}:ruolo" aria-label="Ruolo">${RUOLI_STAFF.map(r => `<option ${r===st.ruolo?'selected':''}>${r}</option>`).join('')}</select>
      <input data-diststaff="${i}:nome" value="${esc(st.nome||'')}" placeholder="Cognome e nome" aria-label="Nome">
      <input data-diststaff="${i}:documento" value="${esc(st.documento||'')}" placeholder="Documento / tessera" aria-label="Documento">
      <button class="iconbtn" aria-label="Togli" data-diststaffdel="${i}">×</button></div>`).join('')}
    <button class="btn small ghost" data-diststaffadd="1">+ Aggiungi</button>
    <label class="f" style="margin-top:10px">Note</label><textarea data-dist="note" rows="2">${esc(d.note||'')}</textarea>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-distpdf="1">Scarica distinta PDF</button></div>
  </section>`;
}
async function pdfDistinta(){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  const d = distinta(), T0 = TEAM(), cat = S.sheet.senzaCategoria ? '' : String(T0?.category || '').replace(/\s*-\s*attività di base/i, '');
  const doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
  const TITOLO = `DISTINTA · ${d.tipo.toUpperCase()}`;
  let y = await intestazionePdf(doc, TITOLO, [cat, d.manifestazione].filter(Boolean).join(' · '));
  /* Campi in alto: etichetta piccola, valore che si adatta alla sua riga */
  const campo = (l, v, x, w) => { doc.setTextColor(...GRIGIO_RGB); riga1(doc, l.toUpperCase(), x, y, w, {size: 7.5, bold: true});
    doc.setTextColor(...INK_RGB); riga1(doc, v || '', x, y + 5.5, w, {size: 11, min: 7.5}); doc.setDrawColor(200); doc.line(x, y + 7, x + w, y + 7); };
  campo('Manifestazione', d.manifestazione, PAG.sx, 120); campo('Data', d.data ? fmtDate(d.data) : '', 140, PAG.dx - 140); y += 13;
  campo('Luogo', d.luogo, PAG.sx, 120); campo('Società', 'Academy Casatese Merate', 140, PAG.dx - 140); y += 14;

  const gg = byName().filter(p => d.giocatori[p.id]?.sel).map(p => ({...d.giocatori[p.id], nome: p.name}))
    .sort((a, b) => (+a.numero || 99) - (+b.numero || 99));
  const staff = d.staff.length ? d.staff : [{ruolo:'Allenatore'}, {ruolo:'Dirigente accompagnatore'}];
  /* Spazio per staff, note e firme, che restano insieme dopo la tabella */
  carattere(doc, 9, false);
  const note = d.note ? doc.splitTextToSize(perPdf('Note: ' + d.note), LARGH).slice(0, 6) : [];
  const coda = 10 + staff.length * 7.5 + (note.length ? note.length * 4.2 + 5 : 0) + 24;
  /* Righe: i giocatori scelti e poi vuote fino a 20 (a penna). Stanno su una pagina se basta stringerle un po' */
  const righe = Math.max(gg.length, 20), testataH = 7;
  const spazio = PAG.basso - y - testataH - coda;
  const h = Math.max(6, Math.min(7.4, (spazio - 1.5) / righe));   // 1,5 mm di margine per gli arrotondamenti
  const cols = [[PAG.sx, 13, 'N°'], [PAG.sx + 13, 89, 'Cognome e nome'], [PAG.sx + 102, 34, 'Data di nascita'], [PAG.sx + 136, LARGH - 136, 'N° tessera']];
  const testata = () => { doc.setFillColor(...BLU_RGB); doc.rect(PAG.sx, y, LARGH, testataH, 'F'); doc.setTextColor(255);
    cols.forEach(([x, w, l]) => riga1(doc, l, x + 2, y + 4.8, w - 4, {size: 9, bold: true})); y += testataH; doc.setTextColor(...INK_RGB); };
  testata();
  const dim = Math.min(10, h * 1.45);   // carattere delle righe, in proporzione all'altezza
  for(let i = 0; i < righe; i++){
    if(y + h > PAG.basso){ y = nuovaPagina(doc, TITOLO); testata(); }
    const g = gg[i] || {};
    if(i % 2){ doc.setFillColor(245, 247, 250); doc.rect(PAG.sx, y, LARGH, h, 'F'); }
    doc.setDrawColor(216, 223, 232); cols.forEach(([x, w]) => doc.rect(x, y, w, h));
    const by = y + h / 2 + dim * 0.13;
    riga1(doc, String(g.numero || ''), cols[0][0], by, cols[0][1], {size: dim, bold: true, align: 'center'});
    riga1(doc, g.nome || '', cols[1][0] + 2, by, cols[1][1] - 4, {size: dim, min: 6.5});
    riga1(doc, g.nascita ? fmtDate(g.nascita) : '', cols[2][0] + 2, by, cols[2][1] - 4, {size: dim});
    riga1(doc, g.tessera || '', cols[3][0] + 2, by, cols[3][1] - 4, {size: dim, min: 6.5});
    y += h;
  }
  /* Staff, note e firme insieme: se non ci stanno, tutti nella pagina dopo */
  if(y + coda > PAG.basso) y = nuovaPagina(doc, TITOLO); else y += 6;
  riga1(doc, 'ALLENATORE E DIRIGENTI', PAG.sx, y, LARGH, {size: 10, bold: true}); y += 3;
  staff.forEach(st => { y += 7.5;
    riga1(doc, `${st.ruolo || ''}:`, PAG.sx, y, 44, {size: 9.5, min: 7});
    riga1(doc, st.nome || '', PAG.sx + 46, y, 70, {size: 9.5, min: 7});
    riga1(doc, st.documento ? 'Doc. ' + st.documento : '', PAG.sx + 120, y, LARGH - 120, {size: 9.5, min: 7});
    doc.setDrawColor(200); doc.line(PAG.sx + 46, y + 1.5, PAG.dx, y + 1.5); });
  if(note.length){ y += 8; carattere(doc, 9, false); note.forEach(r => { doc.text(r, PAG.sx, y); y += 4.2; }); }
  y = Math.max(y + 10, PAG.basso - 16);
  doc.setTextColor(...GRIGIO_RGB);
  riga1(doc, 'Firma del dirigente accompagnatore', PAG.sx, y, 80, {size: 9});
  riga1(doc, "Firma dell'arbitro / organizzazione", PAG.dx - 80, y, 80, {size: 9});
  doc.setDrawColor(150); doc.line(PAG.sx, y + 12, PAG.sx + 80, y + 12); doc.line(PAG.dx - 80, y + 12, PAG.dx, y + 12);
  doc.setTextColor(...INK_RGB);
  await salvaPdf(doc, nomeFile('DISTINTA', cat, d.manifestazione || d.tipo, d.data), 'Distinta');
}
document.addEventListener('input', e => {
  const t = e.target, ds = t.dataset || {}; if(!ds.dist && !ds.distg && !ds.diststaff) return;
  const d = distinta();
  if(ds.dist) d[ds.dist] = t.value;
  if(ds.distg){ const [pid, k] = ds.distg.split(':'); (d.giocatori[pid] ||= {sel:true})[k] = t.value; }
  if(ds.diststaff){ const [i, k] = ds.diststaff.split(':'); d.staff[+i][k] = t.value; }
  save('sheet');
});
document.addEventListener('change', e => {
  const t = e.target; if(!t.dataset?.distsel) return;
  const d = distinta(), g = (d.giocatori[t.dataset.distsel] ||= {}); g.sel = t.checked; save('sheet'); render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-distall],[data-diststaffadd],[data-diststaffdel],[data-distpdf]'); if(!b) return;
  const d = distinta();
  if(b.dataset.distall !== undefined){ S.players.forEach(p => { (d.giocatori[p.id] ||= {}).sel = b.dataset.distall === '1'; }); save('sheet'); render(); return; }
  if(b.dataset.diststaffadd){ d.staff.push({ruolo:'Dirigente accompagnatore', nome:'', documento:''}); save('sheet'); render(); return; }
  if(b.dataset.diststaffdel !== undefined){ d.staff.splice(+b.dataset.diststaffdel, 1); save('sheet'); render(); return; }
  if(b.dataset.distpdf) pdfDistinta();
});

/* ---------- Comunicazione su carta intestata (dagli Avvisi) ---------- */
async function pdfComunicazione(a){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  const doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
  /* categoria nell'intestazione: quella scelta (Modulistica) o, dagli Avvisi, la squadra se è una sola */
  const categoria = a.mostraCat === false ? '' : (a.categoria ?? ((a.squadre||[]).length === 1 ? (S.teams.find(t => t.id === a.squadre[0])?.category || '') : ''));
  /* stessa intestazione della convocazione (FIGC-SGS, ACADEMY / CASATESE MERATE / categoria, stemma) */
  let y;
  try{
    const [logo, figc] = await Promise.all([loadLogo(), loadImg('figc-sgs-logo.png')]); await ensureFonts();
    const img = immagineIntestazione(logo, figc, categoria), hMm = 210 * img.height / img.width;
    doc.addImage(img.toDataURL('image/png'), 'PNG', 0, 0, 210, hMm); y = hMm + 2;
  }catch(e){ y = await intestazionePdf(doc, 'COMUNICAZIONE', categoria); }   // (pagina aperta come file: niente stemmi)
  doc.setDrawColor(...BLU_RGB); doc.setLineWidth(0.6); doc.line(PAG.sx, y, PAG.dx, y); y += 7;
  doc.setTextColor(...BLU_RGB); riga1(doc, 'COMUNICAZIONE', PAG.sx, y, 100, {size: 13, bold: true});
  doc.setTextColor(...GRIGIO_RGB);
  riga1(doc, `Merate, ${a.data ? fmtDate(a.data) : fmtDate(todayISO())}`, PAG.sx, y, LARGH, {size: 10, align: 'right'}); y += 11;
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

/* ---------- Programma gare di un periodo (Modulistica → Programma gare) ---------- */
let progDal = null, progAl = null, progSquadre = [];
function viewProgramma(){
  caricaTuttiCal();
  if(!progDal){ const [sab, dom] = weekendISO(); const d = new Date(sab+'T12:00:00'); d.setDate(d.getDate() - 5); progDal = d.toISOString().slice(0,10); progAl = dom; }
  const squadre = (tuttiCal || S.teams).filter(t => !t.organizza && !t.vedeTutte && ((t.matches||[]).length || t.id === curTeam));
  const ms = programmaPartite();
  let giorno = '';
  const righe = ms.map(m => { const testa = m.date !== giorno ? `<li class="calmese">${weekday(m.date)} ${fmtDate(m.date)}</li>` : ''; giorno = m.date; return testa + rigaPartita(m, true, false); }).join('');
  return `<section class="panel">
    <h2>Programma gare</h2>
    <p class="hint">Partite ed eventi di un periodo, per tutta la società o per le squadre che scegli. Da consultare qui o da stampare in PDF.</p>
    <div class="grid"><div><label class="f" for="pg_dal">Dal</label><input id="pg_dal" type="date" data-prog="dal" value="${esc(progDal)}"></div>
      <div><label class="f" for="pg_al">Al</label><input id="pg_al" type="date" data-prog="al" value="${esc(progAl)}"></div></div>
    <label class="f" style="margin-top:8px">Squadre <span class="note">(nessuna scelta = tutte)</span></label>
    <div class="gchips" style="flex-wrap:wrap">${squadre.map(t => `<button class="gchip" data-progsq="${esc(t.id)}" aria-pressed="${progSquadre.includes(t.id)}">${esc(siglaSquadra(t))}</button>`).join('')}</div>
    <div class="row" style="margin:12px 0"><button class="btn primary" data-progpdf="1" ${ms.length ? '' : 'disabled'}>Scarica programma PDF</button><span class="note">${ms.length} ${ms.length===1 ? 'impegno' : 'impegni'}</span></div>
    ${tuttiCal ? '' : '<p class="note">Carico le altre squadre…</p>'}
    ${ms.length ? `<ul class="wklist callist">${righe}</ul>` : '<p class="empty">Nessun impegno nel periodo.</p>'}
  </section>`;
}
function programmaPartite(){
  return partiteTutte().filter(m => m.date && m.date >= progDal && m.date <= progAl)
    .filter(m => !progSquadre.length || (m.evento ? !(m.evento.squadre||[]).length || m.evento.squadre.some(id => progSquadre.includes(id)) : progSquadre.includes(m.team?.id)));
}
async function pdfProgramma(){
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  const ms = programmaPartite();
  const doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
  const quali = progSquadre.length ? progSquadre.map(id => siglaSquadra((tuttiCal||S.teams).find(t => t.id===id))).join(', ') : 'Tutte le squadre';
  const TITOLO = 'PROGRAMMA GARE';
  let y = await intestazionePdf(doc, TITOLO, `Dal ${fmtDate(progDal)} al ${fmtDate(progAl)} · ${quali}`);
  const cols = [[PAG.sx, 24, 'Ora'], [PAG.sx + 24, 18, 'Squadra'], [PAG.sx + 42, 82, 'Partita / evento'], [PAG.sx + 124, LARGH - 124, 'Campo']];
  const testata = () => { doc.setFillColor(...BLU_RGB); doc.rect(PAG.sx, y, LARGH, 7, 'F'); doc.setTextColor(255);
    cols.forEach(([x, w, l]) => riga1(doc, l, x + 2, y + 4.8, w - 4, {size: 9, bold: true})); y += 8.5; doc.setTextColor(...INK_RGB); };
  testata();
  const giornoH = 7;
  /* Ogni partita: partita e campo su al massimo 2 righe, che si adattano; l'altezza segue la cella più alta */
  const misura = m => {
    const titolo = m.evento ? `${m.opponent} (${m.tipo})` : (m.home ? `Academy - ${m.opponent||'?'}` : `${m.opponent||'?'} - Academy`) + (m.friendly ? ` · ${m.tipo || 'Amichevole'}` : '');
    const campo = m.evento ? (m.venue || '') : m.home ? `In casa · ${CAL_NOMI[calDi(m)]}${m.venue ? ' · ' + m.venue : ''}` : (m.venue || 'Trasferta');
    const b1 = misuraBlocco(doc, titolo, cols[2][1] - 4, {size: 9.5, min: 8, maxRighe: 2});
    const b2 = misuraBlocco(doc, campo, cols[3][1] - 4, {size: 8.5, min: 7, maxRighe: 2});
    return {titolo, campo, h: Math.max(b1.righe.length * b1.alt, b2.righe.length * b2.alt) + 3.2};
  };
  let giorno = '';
  for(const m of ms){
    const r = misura(m), nuovoGiorno = m.date !== giorno;
    /* il titolo del giorno non resta mai da solo in fondo alla pagina */
    if(y + r.h + (nuovoGiorno ? giornoH : 0) > PAG.basso){ y = nuovaPagina(doc, TITOLO); testata(); giorno = ''; }
    if(m.date !== giorno){ giorno = m.date; doc.setTextColor(...BLU_RGB);
      riga1(doc, `${weekday(m.date)} ${fmtDate(m.date)}`.toUpperCase(), PAG.sx, y + 4, LARGH, {size: 10.5, bold: true}); y += giornoH; doc.setTextColor(...INK_RGB); }
    doc.setFillColor(...(calDi(m)==='merate' ? BLU_RGB : calDi(m)==='cernusco' ? [212,175,55] : [196,30,58])); doc.rect(PAG.sx, y, 1.4, r.h - 1, 'F');
    const by = y + 4;
    riga1(doc, m.time ? `${m.time.padStart(5,'0')}${m.fine ? '–'+m.fine : ''}` : 'da definire', cols[0][0] + 3, by, cols[0][1] - 4, {size: 9.5, min: 7});
    riga1(doc, m.evento ? 'Evento' : siglaSquadra(m.team), cols[1][0] + 2, by, cols[1][1] - 3, {size: 9.5, min: 7, bold: true});
    blocco(doc, r.titolo, cols[2][0] + 2, by, cols[2][1] - 4, {size: 9.5, min: 8, maxRighe: 2});
    doc.setTextColor(...GRIGIO_RGB); blocco(doc, r.campo, cols[3][0] + 2, by, cols[3][1] - 4, {size: 8.5, min: 7, maxRighe: 2}); doc.setTextColor(...INK_RGB);
    doc.setDrawColor(230); doc.line(PAG.sx, y + r.h - 0.6, PAG.dx, y + r.h - 0.6);
    y += r.h;
  }
  if(!ms.length) riga1(doc, 'Nessun impegno nel periodo.', PAG.sx, y + 6, LARGH, {size: 11});
  await salvaPdf(doc, nomeFile('PROGRAMMA', progDal, progAl), 'Programma gare');
}
document.addEventListener('change', e => {
  const t = e.target; if(!t.dataset?.prog) return;
  if(t.dataset.prog === 'dal') progDal = t.value; else progAl = t.value;
  if(progAl < progDal) progAl = progDal;
  render();
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-progsq],[data-progpdf],[data-avpdf],[data-avbozzapdf]'); if(!b) return;
  if(b.dataset.progsq){ const id = b.dataset.progsq; progSquadre = progSquadre.includes(id) ? progSquadre.filter(x => x!==id) : [...progSquadre, id]; render(); return; }
  if(b.dataset.progpdf){ pdfProgramma(); return; }
  if(b.dataset.avpdf){ const a = avvisiSoc.find(x => x.id === b.dataset.avpdf); if(a) pdfComunicazione(a); return; }
  if(b.dataset.avbozzapdf){ pdfComunicazione({...bozzaAvviso, data: todayISO(), autore: misterName || 'La società'}); }
});

/* ---------- Comunicazione (Modulistica → Comunicazione): titolo e testo su carta intestata, in PDF ----------
   Non si salva e non si pubblica: per mandarla alle famiglie nell'app c'è Calendario → Avvisi. */
let bozzaCom = null;
function viewComunicazione(){
  const mister = !isAdmin() && !isOrg(), mia = TEAM()?.category || '';
  bozzaCom ||= {modello:'libero', titolo:'', testo:'', autore: misterName || (isAdmin() ? 'La società' : ''),
    mostraCat: mister && !!mia, categoria: mister ? mia : ''};
  const b = bozzaCom, categorie = [...new Set(S.teams.filter(t => !t.organizza && !t.vedeTutte).map(t => t.category).filter(Boolean))];
  return `<section class="panel">
    <h2>Comunicazione</h2>
    <p class="hint">Un foglio su carta intestata della società, da stampare o allegare. Per farla arrivare nell'app a mister e famiglie usa Calendario → Avvisi.</p>
    <label class="f" for="com_modello">Modello</label>
    <select id="com_modello" data-com="modello">${Object.entries(MODELLI_AVVISO).map(([k, m]) => `<option value="${k}" ${k===b.modello?'selected':''}>${esc(m.label)}</option>`).join('')}</select>
    <div class="comcat">
      <label class="row" style="gap:8px;margin:0"><input type="checkbox" data-com="mostraCat" ${b.mostraCat ? 'checked' : ''}> Mostra la categoria nell'intestazione</label>
      ${mister ? (mia ? `<span class="note">${esc(mia)}</span>` : '')
        : `<select data-com="categoria" aria-label="Categoria nell'intestazione" ${b.mostraCat ? '' : 'disabled'}><option value="">Scegli la categoria</option>${categorie.map(c => `<option ${c===b.categoria?'selected':''}>${esc(c)}</option>`).join('')}</select>`}
    </div>
    <label class="f" for="com_titolo">Titolo</label><input id="com_titolo" data-com="titolo" value="${esc(b.titolo)}" placeholder="Es. Cambio orario allenamenti">
    <label class="f" for="com_testo">Testo</label><textarea id="com_testo" data-com="testo" rows="10">${esc(b.testo)}</textarea>
    <label class="f" for="com_autore">Firma</label><input id="com_autore" data-com="autore" value="${esc(b.autore)}" placeholder="Es. Il responsabile del settore giovanile">
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary" data-compdf="1" ${b.testo.trim() ? '' : 'disabled'}>Scarica PDF</button>
      <button class="btn ghost" data-comvuota="1">Svuota</button></div>
  </section>`;
}
document.addEventListener('input', e => { const k = e.target.dataset?.com; if(!k || !bozzaCom || ['modello','mostraCat','categoria'].includes(k)) return;
  bozzaCom[k] = e.target.value; const p = document.querySelector('[data-compdf]'); if(p) p.disabled = !bozzaCom.testo.trim(); });
document.addEventListener('change', e => { const k = e.target.dataset?.com; if(!bozzaCom || (k !== 'mostraCat' && k !== 'categoria')) return;
  if(k === 'mostraCat') bozzaCom.mostraCat = e.target.checked; else bozzaCom.categoria = e.target.value;
  setTimeout(render, 0); });
document.addEventListener('change', e => { if(e.target.dataset?.com !== 'modello' || !bozzaCom) return;
  const m = MODELLI_AVVISO[e.target.value]; bozzaCom.modello = e.target.value;
  if(m){ bozzaCom.titolo = m.titolo; bozzaCom.testo = m.testo; } setTimeout(render, 0); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-compdf],[data-comvuota]'); if(!b || !bozzaCom) return;
  if(b.dataset.comvuota){ bozzaCom = null; render(); return; }
  if(b.dataset.compdf) pdfComunicazione({...bozzaCom, data: todayISO()});
});
