/* Portale · Calci piazzati.
   - Modelli della società: shared/schemes, li cura l'admin (anche lui con l'editor unico).
   - I miei schemi: della squadra, in registro/<squadra>.schemi (li salva il mister col PIN, come le presenze).
     Si parte da un modello ("Usa come modello" ne fa una copia) o da un campo vuoto; i preferiti ⭐ stanno in cima.
   - Editor unico, niente modalità: si trascinano pedine e pallone, si tocca una pedina per numero, compito, etichetta e
     giocatore, si disegna scegliendo uno strumento; nome, comando (la chiamata, es. "Braccia alzate") e nota sopra e sotto.
   Chi gioca in ogni pedina vale per la partita (S.sheet.overrides), come prima. */

/* ---------- Dove stanno gli schemi ---------- */
const mieiSchemi = () => (S.reg && S.reg.schemi) || [];
const schemaDa = id => S.schemes.find(q => q.id===id) || mieiSchemi().find(q => q.id===id) || null;
const isMio = sc => !!sc && mieiSchemi().includes(sc);
/* Chi cambia lo schema stesso: i propri li cambia la squadra, quelli della società l'admin (i direttori guardano) */
const modificaBase = sc => !!sc && !readOnly() && (isMio(sc) ? !!curTeam : isAdmin());
function salvaSchema(sc){ if(isMio(sc)){ sc.aggiornato = todayISO(); save('registro'); } else save('schemes'); }
const ordineMiei = () => mieiSchemi().slice().sort((a,b) => (!!b.preferito - !!a.preferito) || (b.aggiornato||'').localeCompare(a.aggiornato||''));
const compitiNoti = () => [...new Set([...S.schemes, ...mieiSchemi()].flatMap(s => s.tokens.map(t => t.role).filter(Boolean)))];

/* ---------- Elenco: i miei schemi (preferiti in cima), poi i modelli della società ---------- */
let filtroSchemi = 'tutti';
const FILTRI_SCHEMI = {tutti:'Tutti', favore:'A favore', sfavore:'A sfavore', scelti:'Scelti'};
function cardSchema(sc, i, mio){
  const isSel = S.sheet.selected.includes(sc.id), A = isAdmin() && !readOnly();
  const azioni = mio
    ? `<button class="btn small primary" data-open="${sc.id}">Modifica</button>
       <button class="iconbtn pzstella${sc.preferito ? ' on' : ''}" data-pzpref="${sc.id}" aria-pressed="${!!sc.preferito}" aria-label="${sc.preferito ? 'Togli dai preferiti' : 'Metti tra i preferiti'}">★</button>`
    : `<button class="btn small" data-open="${sc.id}">${A ? 'Modifica' : 'Apri'}</button>
       ${curTeam && !readOnly() ? `<button class="btn small primary" data-pzcopia="${sc.id}">Usa come modello</button>` : ''}
       ${A ? `<span class="row" style="gap:4px"><button class="iconbtn" aria-label="Sposta su" data-up="${i}">↑</button><button class="iconbtn" aria-label="Sposta giù" data-down="${i}">↓</button></span>` : ''}`;
  return `<div class="scard ${isSel?'sel':''}">
    <button class="scardmain" data-schemecard="${sc.id}" aria-pressed="${isSel}" aria-label="${isSel?'Togli dalla partita':'Scegli per la partita'}: ${esc(sc.name)}">
      <span class="chk2" aria-hidden="true">${isSel?'✓':''}</span>
      ${schemeThumb(sc)}
      <span class="stitle">${mio && sc.preferito ? '<span class="pzstella on" aria-hidden="true">★</span> ' : ''}${esc(sc.name)}<span class="side ${sc.side}">${sc.side==='favore'?'A favore':'A sfavore'}</span></span>
      <span class="ssub">${sc.subtitle ? 'Comando: '+esc(sc.subtitle)+' · ' : ''}${sc.tokens.length} pedine</span>
    </button>
    <div class="row sassign" style="justify-content:space-between;gap:6px;flex-wrap:wrap">${azioni}</div>
  </div>`;
}
function viewSchemes(){
  const sel = S.sheet.selected;
  const passa = sc => filtroSchemi==='tutti' || (filtroSchemi==='scelti' ? sel.includes(sc.id) : sc.side===filtroSchemi);
  const miei = ordineMiei().filter(passa), soc = S.schemes.map((sc,i) => [sc,i]).filter(([sc]) => passa(sc));
  const basi = Object.entries(BASES).map(([k,b]) => `<option value="${k}">${b.name}</option>`).join('');
  const puoCreare = curTeam && !readOnly();
  return `<section class="panel">
    <h2>Calci piazzati</h2>
    <p class="hint">Tocca uno schema per sceglierlo per la partita (va nel foglio gara). <b>I miei schemi</b> sono della squadra: parti da un modello della società con <b>Usa come modello</b>, poi cambia compiti, comando, pedine e frecce. I preferiti ★ stanno in cima.</p>
    <div class="row" style="margin-bottom:10px">
      <div class="seg" role="group" aria-label="Filtro schemi">${Object.entries(FILTRI_SCHEMI).map(([k,l]) => `<button data-filtroschemi="${k}" aria-pressed="${filtroSchemi===k}">${l}${k==='scelti' ? ` (${sel.length})` : ''}</button>`).join('')}</div>
    </div>
    ${curTeam ? `<h3 class="convh3">I miei schemi <span class="note">(${mieiSchemi().length})</span></h3>
      <div class="sgrid">${miei.length ? miei.map(sc => cardSchema(sc, 0, true)).join('') : `<p class="empty">${mieiSchemi().length ? 'Nessuno schema con questo filtro.' : 'Ancora nessuno: scegli un modello qui sotto e tocca Usa come modello.'}</p>`}</div>
      ${puoCreare ? `<div class="row" style="margin:10px 0 4px;gap:8px"><select id="pz_base" style="max-width:240px" aria-label="Da dove partire">${basi}</select><button class="btn small" data-pz="nuovo">+ Nuovo schema vuoto</button></div>` : ''}` : ''}
    <h3 class="convh3" style="margin-top:16px">Modelli della società <span class="note">(${S.schemes.length})</span></h3>
    <div class="sgrid">${soc.length ? soc.map(([sc,i]) => cardSchema(sc, i, false)).join('') : `<p class="empty">${S.schemes.length ? 'Nessuno schema con questo filtro.' : 'Ancora nessuno schema.'}</p>`}</div>
    ${isAdmin() && !readOnly() ? `<div class="row" style="margin-top:10px;gap:8px"><select id="pz_basesoc" style="max-width:240px" aria-label="Da dove partire">${basi}</select><button class="btn small" data-pz="nuovosoc">+ Nuovo modello della società</button></div>` : ''}
  </section>`;
}
document.addEventListener('click', e => { const b = e.target.closest('[data-filtroschemi]'); if(!b) return; filtroSchemi = b.dataset.filtroschemi; render(); });

/* ---------- Campo ---------- */
const STRUMENTI = [['', '✋ Sposta'], ['arrow', '➚ Freccia'], ['arrow-dash', '⇢ Tratteggiata'], ['line', '— Linea'], ['text', 'T Testo']];
function pedinaSVG(sc, t, rm, attr){
  const {p, override} = tokenPlayer(sc, t), col = tokColor(sc, t, rm), sel = selectedToken===t.id && boardMode==='unico';
  const lbl = p ? (matchNum(p.id)||'·') : t.slot;
  return `<g ${attr}="${t.id}" style="cursor:${attr==='data-drop-token' ? 'pointer' : 'grab'}" transform="translate(${t.x} ${t.y*YS})">
    <circle r="3" fill="transparent"/>
    ${sel ? '<circle r="2.5" fill="none" stroke="#1F5FA8" stroke-width=".4"/>' : ''}
    <circle r="1.75" fill="${p?col:'#fff'}" stroke="${p?'#fff':col}" stroke-width=".3" ${p?'':'stroke-dasharray=".6 .4"'}/>
    <text y=".62" text-anchor="middle" font-family="Barlow Condensed, Arial Narrow, sans-serif" font-weight="700" font-size="1.85" fill="${p?'#fff':col}">${lbl}</text>
    ${t.tag ? `<text y="-2.35" text-anchor="middle" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="1.4" fill="#C8102E">${esc(t.tag)}</text>` : ''}
    ${p && override ? `<text x="1.55" y="-1.15" font-family="Barlow, Arial, sans-serif" font-weight="700" font-size="1.5" fill="#1F5FA8" stroke="#fff" stroke-width=".3" paint-order="stroke">*</text>` : ''}
  </g>`;
}
function campoSVG(sc, rm, modifica){
  const draw = [...(sc.draw||[]).map((d,i) => drawG(d, i, 'data-ed-draw', modifica, modifica && selectedDraw?.kind==='draw' && selectedDraw.index===i)),
    ...(modifica ? [] : effDraw(sc).map((d,i) => drawG(d, i, 'data-x', false, false)))].join('');
  const marks = [...(sc.marks||[]).map((m,i) => markG(m, i, 'data-ed-mark', modifica, modifica && selectedDraw?.kind==='mark' && selectedDraw.index===i)),
    ...(modifica ? [] : effMarks(sc).map((m,i) => markG(m, i, 'data-x', false, false)))].join('');
  const toks = effTokens(sc).map(t => pedinaSVG(sc, t, rm, modifica ? 'data-ed-token' : 'data-drop-token')).join('');
  return `<svg class="board${modifica && drawTool ? ' disegno' : ''}" id="board" viewBox="${VX0} ${VY0*YS} ${VX1-VX0} ${(VY1-VY0)*YS}" role="img" aria-label="Schema ${esc(sc.name)}">
    <defs><marker id="arrowhead" markerWidth="3.2" markerHeight="3.2" refX="2.6" refY="1.6" orient="auto" markerUnits="userSpaceOnUse"><path d="M0,0 L3.2,1.6 L0,3.2 Z" fill="#C8102E"/></marker></defs>
    ${fieldSVG()}${draw}${marks}${ballSVG(effBall(sc), modifica)}${toks}
    ${modifica ? '<line id="draftline" x1="0" y1="0" x2="0" y2="0" stroke="#C8102E" stroke-width=".35" opacity="0" pointer-events="none"/>' : ''}
  </svg>`;
}
const legendaCompiti = rm => `<div class="legend">${[...rm.entries()].map(([r,c]) => `<span><i style="background:${c}"></i>${esc(r)}</span>`).join('')}</div>`;
const opzioniGiocatore = (sc, t) => {
  const {p, override} = tokenPlayer(sc, t), dallaForm = P(S.sheet.lineup[t.slot]);
  const rosa = S.players.slice().sort((a,b) => (matchNum(a.id)||99) - (matchNum(b.id)||99) || a.name.localeCompare(b.name,'it'));
  return `<option value="">${dallaForm ? `${matchNum(dallaForm.id) ? matchNum(dallaForm.id)+' · ' : ''}${esc(dallaForm.name)} (formazione)` : 'Nessuno in formazione'}</option>` +
    rosa.map(q => `<option value="${q.id}" ${override && p && p.id===q.id ? 'selected' : ''}>${matchNum(q.id) ? matchNum(q.id)+' · ' : ''}${esc(q.name)}</option>`).join('');
};

/* ---------- Editor unico (i miei schemi; per l'admin anche i modelli della società) ---------- */
function viewSchemaEditor(sc){
  const rm = roleMap(sc), mio = isMio(sc), roles = compitiNoti();
  const t = sc.tokens.find(q => q.id===selectedToken), te = t && effTokens(sc).find(q => q.id===t.id);
  const segno = selectedDraw ? (selectedDraw.kind==='draw' ? (sc.draw||[])[selectedDraw.index] : (sc.marks||[])[selectedDraw.index]) : null;
  const pannello = t ? `<div class="tokpanel">
      <div class="row" style="justify-content:space-between"><b>Pedina ${t.slot}</b><button class="btn small ghost" data-pz="deseleziona">Fatto</button></div>
      <div class="grid">
        <div><label class="f" for="pz_slot">Numero di ruolo</label><select id="pz_slot" data-edtok="slot">${Array.from({length:11},(_,i) => `<option ${i+1===t.slot?'selected':''}>${i+1}</option>`).join('')}</select></div>
        <div><label class="f" for="pz_role">Compito</label><input id="pz_role" data-edtok="role" list="rolelist" value="${esc(t.role)}" placeholder="Es. Primo palo"></div>
        <div><label class="f" for="pz_tag">Etichetta rossa</label><input id="pz_tag" data-edtok="tag" value="${esc(t.tag)}" placeholder="Es. 1 o M"></div>
        <div><label class="f" for="pz_gioc">Giocatore (questa partita)</label><select id="pz_gioc" data-atok="${t.id}">${opzioniGiocatore(sc, te)}</select></div>
      </div>
      <div class="row" style="margin-top:8px"><button class="btn small ghost danger" data-pz="deltok">Togli pedina</button></div>
    </div>`
    : segno ? `<div class="tokpanel"><div class="row" style="gap:8px;justify-content:space-between"><b>${selectedDraw.kind==='mark' ? 'Scritta' : 'Freccia o linea'}</b>
        <span class="row" style="gap:6px">${selectedDraw.kind==='mark' ? '<button class="btn small" data-pz="testo">Cambia testo</button>' : ''}<button class="btn small ghost danger" data-pz="delsegno">Cancella</button><button class="btn small ghost" data-pz="deseleziona">Fatto</button></span></div></div>`
    : `<p class="note pzaiuto">${drawTool==='text' ? 'Tocca il campo dove scrivere.' : drawTool ? 'Trascina sul campo per disegnare. Freccia piena = palla, tratteggiata = movimento.' : 'Trascina pedine e pallone. Tocca una pedina per numero, compito, etichetta e giocatore; tocca una freccia o una scritta per cancellarla.'}</p>`;
  return `<section class="panel pzeditor">
    <div class="row" style="justify-content:space-between;margin-bottom:10px;gap:8px">
      <button class="btn small ghost" data-act="back">← Tutti gli schemi</button>
      <span class="note">${mio ? `I miei schemi${sc.da && schemaDa(sc.da) ? ' · dal modello "' + esc(schemaDa(sc.da).name) + '"' : ''}` : 'Modello della società: lo vedono tutte le squadre'}</span>
      ${mio ? `<button class="iconbtn pzstella${sc.preferito ? ' on' : ''}" data-pzpref="${sc.id}" aria-pressed="${!!sc.preferito}" aria-label="${sc.preferito ? 'Togli dai preferiti' : 'Metti tra i preferiti'}">★</button>` : ''}
    </div>
    <div class="grid" style="margin-bottom:10px">
      <div><label class="f" for="pz_nome">Nome</label><input id="pz_nome" data-edsc="name" value="${esc(sc.name)}"></div>
      <div><label class="f" for="pz_comando">Comando</label><input id="pz_comando" data-edsc="subtitle" value="${esc(sc.subtitle||'')}" placeholder="La chiamata, es. Braccia alzate"></div>
      <div><label class="f" for="pz_side">Tipo</label><select id="pz_side" data-edsc="side"><option value="favore" ${sc.side==='favore'?'selected':''}>A favore</option><option value="sfavore" ${sc.side==='sfavore'?'selected':''}>A sfavore</option></select></div>
    </div>
    <div class="seg pzstrumenti" role="group" aria-label="Strumento">${STRUMENTI.map(([k,l]) => `<button data-pztool="${k}" aria-pressed="${(drawTool||'')===k}">${l}</button>`).join('')}</div>
    ${campoSVG(sc, rm, true)}
    ${legendaCompiti(rm)}
    ${pannello}
    <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
      <button class="btn small" data-pz="addtok">+ Pedina</button>
      <button class="btn small ghost" data-act="resetov">Giocatori dalla formazione</button>
    </div>
    <datalist id="rolelist">${roles.map(r => `<option value="${esc(r)}">`).join('')}</datalist>
    ${assegnaList(sc, rm, roles)}
    <label class="f" for="pz_nota" style="margin-top:14px">Nota sotto lo schema</label>
    <textarea id="pz_nota" data-edsc="note" rows="2" placeholder="Es. Marcatura a uomo sui saltatori">${esc(sc.note||'')}</textarea>
    <div class="row" style="margin-top:16px;justify-content:space-between;gap:8px">
      <button class="btn small" data-pz="duplica">Duplica</button>
      <button class="btn small danger ghost" data-pz="elimina">Elimina schema</button>
    </div>
  </section>`;
}

/* ---------- Modello della società aperto da un mister (o da un direttore): si guarda, si assegnano i giocatori,
   e con "Usa come modello" se ne fa una copia propria da cambiare ---------- */
function viewSchemaModello(sc){
  const rm = roleMap(sc), puo = curTeam && !readOnly();
  return `<section class="panel">
    <div class="row" style="justify-content:space-between;margin-bottom:10px"><button class="btn small ghost" data-act="back">← Tutti gli schemi</button></div>
    <h2>${esc(sc.name)}<span class="side ${sc.side}">${sc.side==='favore'?'A favore':'A sfavore'}</span></h2>
    ${sc.subtitle ? `<p class="hint">Comando: <b>${esc(sc.subtitle)}</b></p>` : ''}
    ${puo ? `<div class="pzcopia"><p>Per cambiare compiti, comando, pedine o frecce fanne una copia tua: resta nei tuoi schemi, anche per le prossime partite.</p>
      <button class="btn primary" data-pzcopia="${sc.id}">Usa come modello</button></div>` : ''}
    ${campoSVG(sc, rm, false)}
    ${legendaCompiti(rm)}
    ${sc.note ? `<p class="note" style="margin-top:10px"><b>Nota:</b> ${esc(sc.note)}</p>` : ''}
    <div class="row" style="margin-top:10px"><button class="btn small ghost" data-act="resetov">Giocatori dalla formazione</button></div>
    ${assegnaList(sc, rm, compitiNoti())}
  </section>`;
}
function viewScheme(){
  const sc = schemaDa(openSchemeId);
  if(!sc){ openSchemeId = null; return viewSchemes(); }
  if(modificaBase(sc)){ if(boardMode !== 'unico'){ boardMode = 'unico'; } return viewSchemaEditor(sc); }
  boardMode = 'assign';
  return viewSchemaModello(sc);
}

/* ---------- Copie e schemi nuovi ---------- */
function usaModello(sc){
  const q = clone(sc), eff = effTokens(sc);
  Object.assign(q, {id: uid('s'), da: sc.id, preferito: true, autore: misterName || '', aggiornato: todayISO()});
  /* com'era per questa partita (posizioni, compiti, frecce aggiunte), come punto di partenza */
  q.tokens = eff.map(t => ({id: uid('t'), slot: t.slot, x: t.x, y: t.y, role: t.role || '', tag: t.tag || ''}));
  q.ball = {...effBall(sc)};
  q.draw = [...(sc.draw||[]), ...effDraw(sc)].map(d => ({...d}));
  q.marks = [...(sc.marks||[]), ...effMarks(sc)].map(m => ({...m}));
  /* i giocatori scelti per la partita passano alla copia; la copia è scelta per la partita (al posto del modello, se c'era) */
  const ov = S.sheet.overrides[sc.id];
  if(ov){ const mappa = Object.fromEntries(sc.tokens.map((t,i) => [t.id, q.tokens[i].id])); S.sheet.overrides[q.id] = Object.fromEntries(Object.entries(ov).map(([k,v]) => [mappa[k], v]).filter(([k]) => k)); }
  S.sheet.selected = S.sheet.selected.includes(sc.id) ? S.sheet.selected.map(i => i===sc.id ? q.id : i) : [q.id, ...S.sheet.selected];
  (S.reg.schemi ||= []).unshift(q);
  save('registro'); save('sheet');
  return q;
}
function nuovoSchema(chiave, dellaSocieta){
  const b = BASES[chiave] || BASES.libero;
  const q = {id: uid('s'), name: b.name, subtitle: '', side: b.side, note: '', legend: '', ball: {...b.ball},
    tokens: Array.from({length:11}, (_,i) => ({id: uid('t'), slot: i+1, x: -22+i*4.5, y: 28, role: '', tag: ''})), marks: [], draw: []};
  if(dellaSocieta){ S.schemes.push(q); save('schemes'); }
  else { Object.assign(q, {preferito: true, autore: misterName || '', aggiornato: todayISO()}); (S.reg.schemi ||= []).unshift(q); save('registro'); }
  if(!S.sheet.selected.includes(q.id)){ S.sheet.selected.push(q.id); save('sheet'); }
  return q;
}
const apri = q => { openSchemeId = q.id; boardMode = 'unico'; selectedToken = null; selectedDraw = null; drawTool = null; render(); window.scrollTo(0,0); };

document.addEventListener('click', e => {
  const b = e.target.closest('[data-pz],[data-pzcopia],[data-pzpref],[data-pztool]'); if(!b) return;
  if(b.dataset.pzcopia){ const sc = schemaDa(b.dataset.pzcopia); if(sc && curTeam && !readOnly()){ apri(usaModello(sc)); setStatus('Copiato nei tuoi schemi'); } return; }
  if(b.dataset.pzpref){ const sc = schemaDa(b.dataset.pzpref); if(isMio(sc) && !readOnly()){ sc.preferito = !sc.preferito; salvaSchema(sc); render(); } return; }
  if(b.dataset.pztool !== undefined){ drawTool = b.dataset.pztool || null; selectedToken = null; selectedDraw = null; render(); return; }
  const azione = b.dataset.pz;
  if(azione === 'nuovo'){ if(curTeam && !readOnly()) apri(nuovoSchema($('#pz_base')?.value, false)); return; }
  if(azione === 'nuovosoc'){ if(isAdmin() && !readOnly()) apri(nuovoSchema($('#pz_basesoc')?.value, true)); return; }
  const sc = schemaDa(openSchemeId); if(!sc || !modificaBase(sc)) return;
  switch(azione){
    case 'deseleziona': selectedToken = null; selectedDraw = null; render(); break;
    case 'addtok': { const usati = new Set(sc.tokens.map(t => t.slot)); const n = {id: uid('t'), slot: [...Array(11)].map((_,i) => i+1).find(k => !usati.has(k)) || 1, x: 0, y: 24, role: '', tag: ''};
      sc.tokens.push(n); selectedToken = n.id; selectedDraw = null; drawTool = null; salvaSchema(sc); render(); break; }
    case 'deltok': sc.tokens = sc.tokens.filter(q => q.id !== selectedToken); selectedToken = null; salvaSchema(sc); render(); break;
    case 'delsegno': if(selectedDraw){ (selectedDraw.kind==='draw' ? sc.draw : sc.marks).splice(selectedDraw.index, 1); selectedDraw = null; salvaSchema(sc); render(); } break;
    case 'testo': if(selectedDraw?.kind==='mark'){ const m = sc.marks[selectedDraw.index], v = prompt('Testo:', m.text);
      if(v != null){ if(v.trim()) m.text = v.trim(); else sc.marks.splice(selectedDraw.index, 1); selectedDraw = null; salvaSchema(sc); render(); } } break;
    case 'duplica': { const q = clone(sc); Object.assign(q, {id: uid('s'), name: sc.name + ' (copia)', aggiornato: todayISO()}); q.tokens.forEach(t => t.id = uid('t'));
      if(isMio(sc)) S.reg.schemi.splice(S.reg.schemi.indexOf(sc) + 1, 0, q); else S.schemes.splice(S.schemes.indexOf(sc) + 1, 0, q);
      salvaSchema(q); apri(q); break; }
    case 'elimina': if(confirm(`Eliminare lo schema "${sc.name}"?`)){
      if(isMio(sc)){ S.reg.schemi = S.reg.schemi.filter(q => q !== sc); save('registro'); } else { S.schemes = S.schemes.filter(q => q !== sc); save('schemes'); }
      S.sheet.selected = S.sheet.selected.filter(i => i !== sc.id); delete S.sheet.overrides[sc.id]; save('sheet');
      openSchemeId = null; boardMode = 'assign'; render(); } break;
  }
});
/* Nome, comando, tipo e nota; numero, compito ed etichetta della pedina scelta */
document.addEventListener('input', e => {
  const t = e.target, k = t.dataset?.edsc, kt = t.dataset?.edtok; if(!k && !kt) return;
  const sc = schemaDa(openSchemeId); if(!sc || !modificaBase(sc)) return;
  if(k && t.tagName !== 'SELECT'){ sc[k] = t.value; salvaSchema(sc); }
  if(kt && t.tagName !== 'SELECT'){ const tk = sc.tokens.find(q => q.id===selectedToken); if(tk){ tk[kt] = t.value; salvaSchema(sc); } }
});
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset?.edsc, kt = t.dataset?.edtok; if(!k && !kt) return;
  const sc = schemaDa(openSchemeId); if(!sc || !modificaBase(sc)) return;
  if(k === 'side'){ sc.side = t.value; salvaSchema(sc); }
  if(kt === 'slot'){ const tk = sc.tokens.find(q => q.id===selectedToken); if(tk){ tk.slot = +t.value; salvaSchema(sc); } }
  /* il compito cambia colore e gruppo: si ridisegna quando il campo perde il cursore */
  if(kt === 'slot' || kt === 'role' || kt === 'tag') setTimeout(render, 0);
});

/* ---------- Tocchi e trascinamenti sul campo dell'editor ---------- */
document.addEventListener('pointerdown', e => {
  if(boardMode !== 'unico') return;
  const svg = $('#board'); if(!svg || !svg.contains(e.target)) return;
  const sc = schemaDa(openSchemeId); if(!sc || !modificaBase(sc)) return;
  const toLocal = ev => { const pt = svg.createSVGPoint(); pt.x = ev.clientX; pt.y = ev.clientY; return pt.matrixTransform(svg.getScreenCTM().inverse()); };
  const cx = v => Math.max(VX0+1, Math.min(VX1-.5, +v.toFixed(2))), cy = v => Math.max(VY0+.5, Math.min(VY1-1, +v.toFixed(2)));
  e.preventDefault();
  if(drawTool === 'text'){
    const p = toLocal(e), txt = prompt('Testo da scrivere sul campo:', '');
    if(txt && txt.trim()){ (sc.marks ||= []).push({text: txt.trim(), x: cx(p.x), y: cy(p.y/YS)}); salvaSchema(sc); }
    render(); return;
  }
  if(drawTool){
    const p0 = toLocal(e), d = {type: drawTool.startsWith('arrow') ? 'arrow' : 'line', dashed: drawTool.endsWith('dash'), x1: cx(p0.x), y1: cy(p0.y/YS), x2: cx(p0.x), y2: cy(p0.y/YS)};
    let mosso = false;
    const mv = ev => { const p = toLocal(ev); d.x2 = cx(p.x); d.y2 = cy(p.y/YS); mosso = true; renderDraftLine(d); };
    const up = () => { svg.removeEventListener('pointermove', mv); svg.removeEventListener('pointerup', up); svg.removeEventListener('pointercancel', up);
      if(mosso && Math.hypot(d.x2-d.x1, (d.y2-d.y1)*YS) > 1){ (sc.draw ||= []).push(d); salvaSchema(sc); } render(); };
    svg.setPointerCapture?.(e.pointerId);
    svg.addEventListener('pointermove', mv); svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    return;
  }
  /* Sposta: pedina o pallone si trascinano; un tocco senza muovere sceglie la pedina */
  const el = e.target.closest('[data-ed-token],[data-ball]');
  if(el){
    const palla = !!el.dataset.ball, tk = palla ? null : sc.tokens.find(q => q.id===el.dataset.edToken);
    const x0 = e.clientX, y0 = e.clientY; let mosso = false;
    el.setPointerCapture?.(e.pointerId);
    const mv = ev => {
      if(!mosso && Math.hypot(ev.clientX-x0, ev.clientY-y0) < 5) return;
      mosso = true;
      const p = toLocal(ev), x = cx(p.x), y = cy(p.y/YS);
      if(palla) sc.ball = {x, y}; else { tk.x = x; tk.y = y; }
      el.setAttribute('transform', `translate(${x} ${y*YS})`);
    };
    const up = () => { el.removeEventListener('pointermove', mv); el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      if(mosso) salvaSchema(sc);
      else if(tk){ selectedToken = selectedToken===tk.id ? null : tk.id; selectedDraw = null; }
      render(); };
    el.addEventListener('pointermove', mv); el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    return;
  }
  const segno = e.target.closest('[data-ed-draw],[data-ed-mark]');
  selectedToken = null;
  selectedDraw = !segno ? null : segno.dataset.edDraw !== undefined ? {kind: 'draw', index: +segno.dataset.edDraw} : {kind: 'mark', index: +segno.dataset.edMark};
  render();
});
