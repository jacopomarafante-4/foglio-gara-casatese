/* Portale · Modulistica: distinta compilabile (tornei, amichevoli omologate), comunicazione su carta intestata,
   programma gare di un periodo (dal–al). PDF testuali con jsPDF (A4 verticale), intestazione della società. */

const BLU_RGB = [0, 61, 165], INK_RGB = [14, 26, 43], GRIGIO_RGB = [91, 107, 128];
/* Intestazione comune: stemma, società, titolo, sottotitolo; restituisce la y da cui continuare */
async function intestazionePdf(doc, titolo, sotto){
  const logo = await loadLogo();
  doc.setFillColor(...BLU_RGB); doc.rect(0, 0, 210, 30, 'F');
  doc.setFillColor(212, 175, 55); doc.rect(0, 30, 150, 1.6, 'F'); doc.setFillColor(196, 30, 58); doc.rect(150, 30, 60, 1.6, 'F');
  doc.setFillColor(255, 255, 255); doc.roundedRect(10, 4, 22, 22, 2, 2, 'F');
  /* stemma: se il browser non lo lascia copiare (es. pagina aperta come file) il PDF esce lo stesso, senza stemma */
  if(logo) try{ const c = document.createElement('canvas'); c.width = logo.naturalWidth; c.height = logo.naturalHeight; c.getContext('2d').drawImage(logo, 0, 0);
    doc.addImage(c.toDataURL('image/png'), 'PNG', 11.5, 5.5, 19, 19); }catch(e){}
  doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.text('ACADEMY CASATESE MERATE', 38, 11);
  doc.setFontSize(17); doc.text(doc.splitTextToSize(titolo, 160)[0], 38, 19);
  if(sotto){ doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(doc.splitTextToSize(sotto, 160)[0], 38, 25.5); }
  doc.setTextColor(...INK_RGB);
  return 42;
}
function piePdf(doc){
  const n = doc.getNumberOfPages();
  for(let i = 1; i <= n; i++){ doc.setPage(i); doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...GRIGIO_RGB);
    doc.text('Academy Casatese Merate · academy-casatese.vercel.app', 10, 290); doc.text(`${i} / ${n}`, 200, 290, {align:'right'}); }
}
async function salvaPdf(doc, nome){
  piePdf(doc);
  try{ if(downloads) await downloads.save({filename: nome, data: doc.output('blob')}); else browserDownload(nome, doc.output('blob')); setStatus('PDF pronto'); }
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
  let y = await intestazionePdf(doc, `DISTINTA · ${d.tipo.toUpperCase()}`, [cat, d.manifestazione].filter(Boolean).join(' · '));
  const riga = (l, v, x, w) => { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(...GRIGIO_RGB); doc.text(l.toUpperCase(), x, y);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(11); doc.setTextColor(...INK_RGB); doc.text(v || '', x, y + 5.5); doc.setDrawColor(200); doc.line(x, y + 7, x + w, y + 7); };
  riga('Manifestazione', d.manifestazione, 10, 120); riga('Data', d.data ? fmtDate(d.data) : '', 140, 60); y += 13;
  riga('Luogo', d.luogo, 10, 120); riga('Società', 'Academy Casatese Merate', 140, 60); y += 15;
  // Tabella giocatori: selezionati, poi righe vuote fino a 20 da compilare a penna
  const gg = byName().filter(p => d.giocatori[p.id]?.sel).map(p => ({...d.giocatori[p.id], nome: p.name}))
    .sort((a,b) => (+a.numero || 99) - (+b.numero || 99));
  const cols = [[10, 14, 'N°'], [24, 86, 'Cognome e nome'], [110, 34, 'Data di nascita'], [144, 56, 'N° tessera']];
  const testata = () => { doc.setFillColor(...BLU_RGB); doc.rect(10, y, 190, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    cols.forEach(([x,,l]) => doc.text(l, x + 2, y + 4.8)); y += 7; doc.setTextColor(...INK_RGB); };
  testata();
  const righe = Math.max(gg.length, 20);
  for(let i = 0; i < righe; i++){
    if(y > 268){ doc.addPage(); y = 14; testata(); }
    const g = gg[i] || {};
    if(i % 2){ doc.setFillColor(245, 247, 250); doc.rect(10, y, 190, 7.2, 'F'); }
    doc.setDrawColor(216, 223, 232); cols.forEach(([x, w]) => doc.rect(x, y, w, 7.2));
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    doc.text(String(g.numero || ''), 12, y + 5); doc.text(doc.splitTextToSize(g.nome || '', 82)[0] || '', 26, y + 5);
    doc.text(g.nascita ? fmtDate(g.nascita) : '', 112, y + 5); doc.text(g.tessera || '', 146, y + 5);
    y += 7.2;
  }
  y += 6; if(y > 240){ doc.addPage(); y = 16; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('ALLENATORE E DIRIGENTI', 10, y); y += 3;
  const staff = d.staff.length ? d.staff : [{ruolo:'Allenatore'}, {ruolo:'Dirigente accompagnatore'}];
  staff.forEach(st => { y += 7; doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(`${st.ruolo || ''}:`, 10, y); doc.text(st.nome || '', 58, y); doc.text(st.documento ? 'Doc. ' + st.documento : '', 130, y); doc.setDrawColor(200); doc.line(58, y + 1.5, 200, y + 1.5); });
  if(d.note){ y += 9; doc.setFontSize(9); doc.text(doc.splitTextToSize('Note: ' + d.note, 190), 10, y); y += 5; }
  y = Math.max(y + 14, 255); if(y > 275){ doc.addPage(); y = 40; }
  doc.setFontSize(9); doc.setTextColor(...GRIGIO_RGB);
  doc.text('Firma del dirigente accompagnatore', 10, y); doc.text("Firma dell'arbitro / organizzazione", 120, y);
  doc.setDrawColor(150); doc.line(10, y + 12, 90, y + 12); doc.line(120, y + 12, 200, y + 12);
  await salvaPdf(doc, nomeFile('DISTINTA', cat, d.manifestazione || d.tipo, d.data));
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
/* I caratteri del PDF (Helvetica) non hanno emoji né simboli fuori dall'alfabeto latino: si tolgono */
const perPdf = t => String(t || '').replace(/[^\x00-\xFF€–—‘’“”…•]/g, '').replace(/^[ \t]+/gm, '');
async function pdfComunicazione(a){
  a = {...a, titolo: perPdf(a.titolo).trim(), testo: perPdf(a.testo)};
  if(!window.jspdf){ setStatus('Libreria PDF non caricata'); return; }
  const doc = new window.jspdf.jsPDF({unit:'mm', format:'a4', compress:true});
  let y = await intestazionePdf(doc, 'COMUNICAZIONE', squadreTesto(a.squadre));
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...GRIGIO_RGB);
  doc.text(`Merate, ${a.data ? fmtDate(a.data) : fmtDate(todayISO())}`, 200, y, {align:'right'}); y += 10;
  if(a.titolo){ doc.setFont('helvetica', 'bold'); doc.setFontSize(15); doc.setTextColor(...BLU_RGB); doc.splitTextToSize(a.titolo, 190).forEach(r => { doc.text(r, 10, y); y += 7; }); y += 3; }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(11.5); doc.setTextColor(...INK_RGB);
  for(const r of doc.splitTextToSize(a.testo || '', 190)){ if(y > 275){ doc.addPage(); y = 16; } doc.text(r, 10, y); y += 6; }
  y += 12; if(y > 270){ doc.addPage(); y = 30; }
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text('Academy Casatese Merate', 200, y, {align:'right'});
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...GRIGIO_RGB); doc.text(a.autore || 'La società', 200, y + 5, {align:'right'});
  await salvaPdf(doc, nomeFile('COMUNICAZIONE', a.titolo || '', a.data));
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
  let y = await intestazionePdf(doc, 'PROGRAMMA GARE', `Dal ${fmtDate(progDal)} al ${fmtDate(progAl)} · ${quali}`);
  const cols = [[10, 26, 'Ora'], [36, 20, 'Squadra'], [56, 82, 'Partita / evento'], [138, 62, 'Campo']];
  const testata = () => { doc.setFillColor(...BLU_RGB); doc.rect(10, y, 190, 7, 'F'); doc.setTextColor(255); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    cols.forEach(([x,,l]) => doc.text(l, x + 2, y + 4.8)); y += 8; doc.setTextColor(...INK_RGB); };
  testata();
  let giorno = '';
  for(const m of ms){
    if(y > 270){ doc.addPage(); y = 14; testata(); giorno = ''; }
    if(m.date !== giorno){ giorno = m.date; doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.setTextColor(...BLU_RGB);
      doc.text(`${weekday(m.date)} ${fmtDate(m.date)}`.toUpperCase(), 10, y + 4); y += 6.5; doc.setTextColor(...INK_RGB); }
    const titolo = m.evento ? `${m.opponent} (${m.tipo})` : (m.home ? `Academy - ${m.opponent||'?'}` : `${m.opponent||'?'} - Academy`) + (m.friendly ? ` · ${m.tipo || 'Amichevole'}` : '');
    const campo = m.evento ? m.venue : m.home ? `In casa · ${CAL_NOMI[calDi(m)]}` : (m.venue || 'Trasferta');
    const r1 = doc.splitTextToSize(titolo, 80), r2 = doc.splitTextToSize(campo || '', 60), h = Math.max(r1.length, r2.length) * 4.4 + 2.4;
    doc.setFillColor(...(calDi(m)==='merate' ? BLU_RGB : calDi(m)==='cernusco' ? [212,175,55] : [196,30,58])); doc.rect(10, y, 1.4, h - 1, 'F');
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    doc.text(m.time ? `${m.time.padStart(5,'0')}${m.fine ? '–'+m.fine : ''}` : 'da definire', 13, y + 4);
    doc.setFont('helvetica', 'bold'); doc.text(m.evento ? 'Evento' : siglaSquadra(m.team), 38, y + 4);
    doc.setFont('helvetica', 'normal'); doc.text(r1, 58, y + 4); doc.setTextColor(...GRIGIO_RGB); doc.text(r2, 140, y + 4); doc.setTextColor(...INK_RGB);
    doc.setDrawColor(230); doc.line(10, y + h - 0.6, 200, y + h - 0.6);
    y += h;
  }
  if(!ms.length){ doc.setFontSize(11); doc.text('Nessun impegno nel periodo.', 10, y + 6); }
  await salvaPdf(doc, nomeFile('PROGRAMMA', progDal, progAl));
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
  bozzaCom ||= {modello:'libero', squadre:[], titolo:'', testo:'', autore: misterName || (isAdmin() ? 'La società' : '')};
  const b = bozzaCom, squadre = S.teams.filter(t => !t.organizza && !t.vedeTutte);
  return `<section class="panel">
    <h2>Comunicazione</h2>
    <p class="hint">Un foglio su carta intestata della società, da stampare o allegare. Per farla arrivare nell'app a mister e famiglie usa Calendario → Avvisi.</p>
    <label class="f" for="com_modello">Modello</label>
    <select id="com_modello" data-com="modello">${Object.entries(MODELLI_AVVISO).map(([k, m]) => `<option value="${k}" ${k===b.modello?'selected':''}>${esc(m.label)}</option>`).join('')}</select>
    <label class="f" style="margin-top:8px">Per <span class="note">(nessuna scelta = tutta la società)</span></label>
    <div class="gchips" style="flex-wrap:wrap">${squadre.map(t => `<button class="gchip" data-comsq="${esc(t.id)}" aria-pressed="${b.squadre.includes(t.id)}">${esc(siglaSquadra(t))}</button>`).join('')}</div>
    <label class="f" for="com_titolo">Titolo</label><input id="com_titolo" data-com="titolo" value="${esc(b.titolo)}" placeholder="Es. Cambio orario allenamenti">
    <label class="f" for="com_testo">Testo</label><textarea id="com_testo" data-com="testo" rows="10">${esc(b.testo)}</textarea>
    <label class="f" for="com_autore">Firma</label><input id="com_autore" data-com="autore" value="${esc(b.autore)}" placeholder="Es. Il responsabile del settore giovanile">
    <div class="row" style="margin-top:12px;gap:8px"><button class="btn primary" data-compdf="1" ${b.testo.trim() ? '' : 'disabled'}>Scarica PDF</button>
      <button class="btn ghost" data-comvuota="1">Svuota</button></div>
  </section>`;
}
document.addEventListener('input', e => { const k = e.target.dataset?.com; if(!k || !bozzaCom || k === 'modello') return;
  bozzaCom[k] = e.target.value; const p = document.querySelector('[data-compdf]'); if(p) p.disabled = !bozzaCom.testo.trim(); });
document.addEventListener('change', e => { if(e.target.dataset?.com !== 'modello' || !bozzaCom) return;
  const m = MODELLI_AVVISO[e.target.value]; bozzaCom.modello = e.target.value;
  if(m){ bozzaCom.titolo = m.titolo; bozzaCom.testo = m.testo; } setTimeout(render, 0); });
document.addEventListener('click', e => {
  const b = e.target.closest('[data-comsq],[data-compdf],[data-comvuota]'); if(!b || !bozzaCom) return;
  if(b.dataset.comsq){ const id = b.dataset.comsq; bozzaCom.squadre = bozzaCom.squadre.includes(id) ? bozzaCom.squadre.filter(x => x!==id) : [...bozzaCom.squadre, id]; render(); return; }
  if(b.dataset.comvuota){ bozzaCom = null; render(); return; }
  if(b.dataset.compdf) pdfComunicazione({...bozzaCom, data: todayISO()});
});
