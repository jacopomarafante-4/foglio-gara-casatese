/* Portale · Segreteria (0031): anagrafica dei tesserati, contatti dei genitori, certificato medico, taglie, iscrizione,
   quote, PIN delle famiglie (mandato su WhatsApp). La vedono admin, direttori e segreteria (gestisce_segreteria()).
   Dati di minori: stanno nelle tabelle protette tesserati / tesserati_dati, mai nei documenti del Portale.
   Squadre e rose arrivano da segreteria_rose() (senza PIN dei mister). */

let segRose = null, segTess = null, segErrore = '', segSquadra = '', segAperto = null, segFiltro = '';
const SITO = 'https://academy-casatese.vercel.app';

async function caricaSegreteria(){
  if(!supabaseClient) return;
  segRose = 'loading';
  const [r, t] = await Promise.all([
    supabaseClient.rpc('segreteria_rose'),
    supabaseClient.from('tesserati').select('*, tesserati_dati(*)')
  ]);
  if(r.error || t.error){ segErrore = 'Segreteria non disponibile: serve la migrazione 0031 (e un accesso da admin, direttore o segreteria).'; segRose = []; segTess = []; render(); return; }
  segRose = (r.data || []).filter(s => (s.players||[]).length);
  segTess = t.data || [];
  if(!segSquadra || !segRose.some(s => s.id === segSquadra)) segSquadra = segRose[0]?.id || '';
  await creaMancanti();
  render();
}
/* Ogni giocatore della rosa ha il suo tesserato (si crea la prima volta che si apre la squadra) */
async function creaMancanti(){
  const sq = (segRose||[]).find(s => s.id === segSquadra); if(!sq) return;
  const nuovi = sq.players.filter(p => !segTess.some(t => t.squadra_id === sq.id && t.giocatore_id === p.id))
    .map(p => ({squadra_id: sq.id, giocatore_id: p.id, nome_completo: p.name}));
  if(!nuovi.length) return;
  const { data, error } = await supabaseClient.from('tesserati').insert(nuovi).select('*, tesserati_dati(*)');
  if(!error && data) segTess.push(...data);
}
const datiDi = t => (Array.isArray(t.tesserati_dati) ? t.tesserati_dati[0] : t.tesserati_dati) || {};
const giorniA = d => d ? Math.round((new Date(d+'T12:00:00') - new Date(todayISO()+'T12:00:00')) / 86400000) : null;
function statoCertificato(d){
  const g = giorniA(d.certificato_scadenza);
  if(g == null) return {k:'manca', l:'Certificato mancante'};
  if(g < 0) return {k:'scaduto', l:'Certificato scaduto'};
  if(g <= 30) return {k:'scade', l:`Certificato: scade tra ${g} giorni`};
  return {k:'ok', l:`Certificato fino al ${fmtDate(d.certificato_scadenza)}`};
}
const quoteDaPagare = d => (d.quote||[]).filter(q => !q.pagata);
const telWa = n => { let x = String(n||'').replace(/[^\d+]/g, ''); if(x.startsWith('+')) x = x.slice(1); else if(x.startsWith('00')) x = x.slice(2); else if(x && !x.startsWith('39')) x = '39' + x; return x; };
function messaggioPin(t){
  const sq = (segRose||[]).find(s => s.id === t.squadra_id);
  return `Academy Casatese Merate · ${sq?.category || ''}\nCiao! Da oggi potete seguire ${t.nome_completo} dal Portale della società: convocazioni (con la risposta "ci sarà / non ci sarà"), calendario, avvisi, iscrizione e quote.\n\n1. Aprite ${SITO}\n2. Inserite il PIN: ${t.pin}\n\nIl PIN è personale: non giratelo ad altri.`;
}

/* ---------- Salvataggio (con un attimo di attesa mentre si scrive) ---------- */
const segTimer = {};
function salvaTesserato(t, campi){
  Object.assign(t, campi); setStatus('Salvataggio…');
  clearTimeout(segTimer['t'+t.id]);
  segTimer['t'+t.id] = setTimeout(async () => {
    const { error } = await supabaseClient.from('tesserati').update({...campi, updated_at: new Date().toISOString()}).eq('id', t.id);
    setStatus(error ? 'Non salvato: riprova' : 'Salvato');
  }, 600);
}
function salvaDati(t, campi){
  const d = datiDi(t); Object.assign(d, campi); t.tesserati_dati = d; setStatus('Salvataggio…');
  clearTimeout(segTimer['d'+t.id]);
  segTimer['d'+t.id] = setTimeout(async () => {
    const { error } = await supabaseClient.from('tesserati_dati').upsert({...d, tesserato_id: t.id, updated_at: new Date().toISOString()});
    setStatus(error ? 'Non salvato: riprova' : 'Salvato');
  }, 600);
}

/* ---------- Vista ---------- */
function viewTesserati(){
  if(segRose === null){ caricaSegreteria(); return '<section class="panel"><p class="note">Carico i tesserati…</p></section>'; }
  if(segRose === 'loading') return '<section class="panel"><p class="note">Carico i tesserati…</p></section>';
  if(segErrore) return `<section class="panel"><h2>Segreteria</h2><p class="empty">${esc(segErrore)}</p></section>`;
  const sq = segRose.find(s => s.id === segSquadra);
  const tess = segTess.filter(t => t.squadra_id === segSquadra).sort((a,b) => a.nome_completo.localeCompare(b.nome_completo, 'it'));
  const conta = f => tess.filter(f).length;
  const cert = t => statoCertificato(datiDi(t));
  const filtri = {
    '': ['Tutti', tess.length],
    cert: ['Certificato da sistemare', conta(t => cert(t).k !== 'ok')],
    iscr: ['Iscrizione incompleta', conta(t => !datiDi(t).iscrizione_completa)],
    quote: ['Rate da pagare', conta(t => quoteDaPagare(datiDi(t)).length)],
    pin: ['Senza PIN famiglia', conta(t => !t.pin)]
  };
  const lista = tess.filter(t => segFiltro==='' || (segFiltro==='cert' && cert(t).k !== 'ok') || (segFiltro==='iscr' && !datiDi(t).iscrizione_completa)
    || (segFiltro==='quote' && quoteDaPagare(datiDi(t)).length) || (segFiltro==='pin' && !t.pin));
  const f = (t, k, l, tipo='text', ph='') => `<div><label class="f">${l}</label><input type="${tipo}" data-segd="${t.id}:${k}" value="${esc(datiDi(t)[k] ?? '')}" placeholder="${esc(ph)}"></div>`;
  const scheda = t => {
    const d = datiDi(t), c = cert(t), qd = quoteDaPagare(d);
    const badges = [`<span class="sbadge c-${c.k}">${c.k==='ok' ? 'Certificato ok' : c.l}</span>`,
      d.iscrizione_completa ? '<span class="sbadge c-ok">Iscritto</span>' : '<span class="sbadge c-scade">Iscrizione da completare</span>',
      qd.length ? `<span class="sbadge c-scade">${qd.length} ${qd.length===1 ? 'rata' : 'rate'} da pagare</span>` : '',
      t.pin ? '<span class="sbadge c-ok">PIN famiglia</span>' : '<span class="sbadge c-manca">Senza PIN</span>'].join('');
    const quote = (d.quote||[]).map((q, i) => `<div class="qrow">
        <input data-segq="${t.id}:${i}:rata" value="${esc(q.rata||'')}" placeholder="Es. 1ª rata" aria-label="Rata">
        <input data-segq="${t.id}:${i}:importo" value="${esc(q.importo||'')}" placeholder="€" inputmode="decimal" aria-label="Importo">
        <input type="date" data-segq="${t.id}:${i}:scadenza" value="${esc(q.scadenza||'')}" aria-label="Scadenza">
        <label class="row" style="gap:4px"><input type="checkbox" data-segq="${t.id}:${i}:pagata" ${q.pagata?'checked':''}> Pagata</label>
        <button class="iconbtn" aria-label="Togli rata" data-segqdel="${t.id}:${i}">×</button></div>`).join('');
    const tel = d.genitore1_tel || d.genitore2_tel;
    return `<details class="grow segrow st-${c.k==='ok' && d.iscrizione_completa && !qd.length ? 'inserito' : 'da_rivedere'}" ${t.id===segAperto ? 'open' : ''} data-segapri="${t.id}">
      <summary><div class="gtesta"><div class="gprinc"><div class="gnome"><b>${esc(t.nome_completo)}</b>${t.numero ? `<span class="gruolo">N. ${t.numero}</span>` : ''}</div>
        <div class="sbadges">${badges}</div></div></div></summary>
      <div class="segform">
        <h4>Ragazzo</h4>
        <div class="grid">
          <div><label class="f">Data di nascita</label><input type="date" data-segt="${t.id}:data_nascita" value="${esc(t.data_nascita||'')}"></div>
          <div><label class="f">Numero di maglia</label><input type="number" inputmode="numeric" data-segt="${t.id}:numero" value="${esc(t.numero ?? '')}"></div>
          ${f(t,'taglia_divisa','Taglia divisa','text','Es. M')}${f(t,'taglia_tuta','Taglia tuta','text','Es. 152')}
        </div>
        <h4>Genitori</h4>
        <div class="grid">
          ${f(t,'genitore1_nome','Genitore 1')}${f(t,'genitore1_tel','Telefono','tel')}${f(t,'genitore1_email','Email','email')}
          ${f(t,'genitore2_nome','Genitore 2')}${f(t,'genitore2_tel','Telefono','tel')}${f(t,'genitore2_email','Email','email')}
        </div>
        <h4>Certificato medico e iscrizione</h4>
        <div class="grid">
          ${f(t,'certificato_scadenza','Certificato valido fino al','date')}
          <div><label class="f">Documenti mancanti</label><input data-segd="${t.id}:documenti_mancanti" value="${esc(d.documenti_mancanti||'')}" placeholder="Es. foto, modulo privacy"></div>
        </div>
        <label class="row" style="gap:6px;margin-top:8px"><input type="checkbox" data-segd="${t.id}:iscrizione_completa" ${d.iscrizione_completa?'checked':''}> Iscrizione e tesseramento completati</label>
        <h4>Quote</h4>
        ${quote || '<p class="note">Nessuna rata.</p>'}
        <button class="btn small ghost" data-segqadd="${t.id}">+ Aggiungi rata</button>
        <h4>Note della segreteria <span class="note">(la famiglia non le vede)</span></h4>
        <textarea data-segd="${t.id}:note_segreteria">${esc(d.note_segreteria||'')}</textarea>
        <h4>Accesso della famiglia</h4>
        ${t.pin ? `<p>PIN: <span class="code">${esc(t.pin)}</span></p>` : '<p class="note">Nessun PIN: generalo e mandalo alla famiglia.</p>'}
        <div class="row" style="gap:8px">
          <button class="btn small ${t.pin ? 'ghost' : 'primary'}" data-segpin="${t.id}">${t.pin ? 'Rigenera PIN' : 'Genera PIN'}</button>
          ${t.pin && tel ? `<a class="btn small primary" href="https://wa.me/${telWa(tel)}?text=${encodeURIComponent(messaggioPin(t))}" target="_blank" rel="noopener">Manda il PIN su WhatsApp</a>` : ''}
          ${t.pin && !tel ? '<span class="note">Per mandarlo su WhatsApp scrivi il telefono di un genitore.</span>' : ''}
        </div>
      </div></details>`;
  };
  return `<section class="panel">
    <h2>Segreteria · tesserati</h2>
    <p class="hint">Anagrafica, genitori, certificato medico, taglie, iscrizione e quote di ogni ragazzo, e il PIN con cui la famiglia entra nel Portale. Si salva da solo.</p>
    <div class="row" style="gap:8px;margin-bottom:8px"><label class="note" for="seg_sq">Squadra</label>
      <select id="seg_sq" data-segsq="1">${segRose.map(s => `<option value="${esc(s.id)}" ${s.id===segSquadra?'selected':''}>${esc(s.category || s.name)}</option>`).join('')}</select></div>
    <div class="gchips" style="flex-wrap:wrap;margin-bottom:6px">${Object.entries(filtri).map(([k,[l,n]]) => `<button class="gchip" data-segfiltro="${k}" aria-pressed="${k===segFiltro}">${l} <span>${n}</span></button>`).join('')}</div>
    ${sq ? (lista.length ? lista.map(scheda).join('') : '<p class="empty">Nessun ragazzo con questo filtro.</p>') : '<p class="empty">Nessuna squadra con la rosa.</p>'}
  </section>`;
}

/* ---------- Eventi ---------- */
const trovaTess = id => (segTess||[]).find(t => t.id === id);
document.addEventListener('input', e => {
  const x = e.target, ds = x.dataset || {};
  if(ds.segt){ const [id, k] = ds.segt.split(':'), t = trovaTess(id); if(!t) return;
    salvaTesserato(t, {[k]: k==='numero' ? (x.value === '' ? null : +x.value) : (x.value || null)}); segAperto = id; return; }
  if(ds.segd){ const [id, k] = ds.segd.split(':'), t = trovaTess(id); if(!t) return;
    salvaDati(t, {[k]: x.type==='checkbox' ? x.checked : (x.value || null)}); segAperto = id; return; }
  if(ds.segq){ const [id, i, k] = ds.segq.split(':'), t = trovaTess(id); if(!t) return;
    const q = [...(datiDi(t).quote||[])]; q[+i] = {...q[+i], [k]: x.type==='checkbox' ? x.checked : x.value};
    salvaDati(t, {quote: q}); segAperto = id; }
});
document.addEventListener('change', e => {
  const ds = e.target.dataset || {};
  if(ds.segsq){ segSquadra = e.target.value; segAperto = null; creaMancanti().then(render); return; }
  if(ds.segd?.endsWith(':iscrizione_completa') || ds.segq?.endsWith(':pagata') || ds.segd?.endsWith(':certificato_scadenza')) render();
});
document.addEventListener('click', async e => {
  const b = e.target.closest('[data-segfiltro],[data-segqadd],[data-segqdel],[data-segpin],[data-segapri] > summary'); if(!b) return;
  const ds = b.dataset || {};
  if(ds.segfiltro !== undefined){ segFiltro = ds.segfiltro; render(); return; }
  if(ds.segqadd){ const t = trovaTess(ds.segqadd); if(!t) return; salvaDati(t, {quote: [...(datiDi(t).quote||[]), {rata:'', importo:'', scadenza:'', pagata:false}]}); segAperto = t.id; render(); return; }
  if(ds.segqdel){ const [id, i] = ds.segqdel.split(':'), t = trovaTess(id); if(!t) return; const q = [...(datiDi(t).quote||[])]; q.splice(+i, 1); salvaDati(t, {quote: q}); segAperto = id; render(); return; }
  if(ds.segpin){ const t = trovaTess(ds.segpin); if(!t) return;
    if(t.pin && !confirm('Rigenerare il PIN? Quello vecchio smette di funzionare.')) return;
    const { data, error } = await supabaseClient.rpc('genera_pin_famiglia', {p_tesserato: t.id});
    if(error){ setStatus('PIN non generato: riprova'); return; }
    t.pin = data; segAperto = t.id; setStatus('PIN generato'); render(); return; }
  /* ricorda quale scheda è aperta, così resta aperta quando la pagina si aggiorna */
  const d = b.closest('[data-segapri]'); if(d) setTimeout(() => { segAperto = d.open ? d.dataset.segapri : (segAperto === d.dataset.segapri ? null : segAperto); }, 0);
});
