/* Portale · Famiglia (0031): entra col PIN del ragazzo e vede SOLO lui: convocazioni (con "ci sarà / non ci sarà"),
   calendario della squadra, avvisi, anagrafica (contatti dei genitori e taglie modificabili), iscrizione e quote.
   Tutto arriva da famiglia_get(pin); si scrive solo con famiglia_contatti e famiglia_rispondi. */

let famPin = null, F = null, famTab = 'home', famAt = 0, famBozza = null;
async function famigliaLogin(pin){
  if(!supabaseClient) return false;
  const { data, error } = await supabaseClient.rpc('famiglia_get', { p_pin: pin });
  if(error || !data) return false;
  famPin = pin; F = data; famAt = Date.now(); impostaROLE('famiglia'); impostaHashLocked(true); impostaTeamsLoaded(true);
  if(F.squadra){ S.teams = [F.squadra]; impostaCurTeam(F.squadra.id); }   // per i nomi delle partite nel calendario
  setInterval(aggiornaFamiglia, 60000);
  render();
  return true;
}
async function aggiornaFamiglia(forza){
  if(!famPin || !supabaseClient || (!forza && Date.now() - famAt < 55000)) return;
  const { data, error } = await supabaseClient.rpc('famiglia_get', { p_pin: famPin });
  if(!error && data){ F = data; famAt = Date.now(); if(!famBozza) render(); }
}
const chiavePartita = c => c.calId || `${c.date}|${c.opponent}`;
const mapsDi = c => c.ll ? 'https://www.google.com/maps/dir/?api=1&destination=' + c.ll
  : (c.venue || c.address) ? 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent([c.venue, c.address].filter(Boolean).join(', ')) : '';

function viewFamigliaHome(){
  const oggi = todayISO(), conv = (F.convocazioni||[]).filter(c => c.date && c.date >= oggi).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||'')));
  const d = F.dati || {}, g = giorniA(d.certificato_scadenza);
  const cert = g == null ? '' : g < 0 ? `<div class="hcard hwide avvisocert ko"><b>Certificato medico scaduto</b><p class="note">Era valido fino al ${fmtDate(d.certificato_scadenza)}: senza certificato il ragazzo non può giocare. Portatelo in segreteria.</p></div>`
    : g <= 30 ? `<div class="hcard hwide avvisocert"><b>Certificato medico in scadenza</b><p class="note">Scade il ${fmtDate(d.certificato_scadenza)} (tra ${g} giorni): prenotate la visita.</p></div>` : '';
  const scheda = c => {
    const k = chiavePartita(c), r = (F.risposte||{})[k]?.risposta, con = c.stato === 'CON', maps = mapsDi(c);
    const ritrovo = c.meetTime || minus75(c.time);
    return `<div class="hcard hwide hmatch convfam ${con ? '' : 'nc'}">
      <div class="hlabel">${con ? 'Convocato' : CALLUP_LABELS[c.stato] || 'Non convocato'} · ${weekday(c.date)} ${fmtDate(c.date)}</div>
      <div class="hbig">${esc(c.home ? `${F.squadra?.category || 'Academy'} - ${c.opponent||''}` : `${c.opponent||''} - ${F.squadra?.category || 'Academy'}`)}</div>
      ${con ? `<div class="note">${c.time ? `Inizio ${esc(c.time)}` : ''}${ritrovo ? ` · <b>ritrovo alle ${esc(ritrovo)}</b>` : ''}${c.meetAddress ? ' a '+esc(c.meetAddress) : ''}</div>
        <div class="note">${esc([c.venue, c.address].filter(Boolean).join(', '))}${maps ? ` · <a href="${esc(maps)}" target="_blank" rel="noopener">📍 Apri in Google Maps</a>` : ''}</div>
        ${c.note ? `<p class="note">${esc(c.note)}</p>` : ''}
        <div class="row" style="margin-top:12px;gap:8px">
          <button class="btn ${r==='si' ? 'primary' : ''}" data-famrisp="${esc(k)}" data-v="si">✓ Ci sarà</button>
          <button class="btn ${r==='no' ? 'danger-on' : ''}" data-famrisp="${esc(k)}" data-v="no">✗ Non ci sarà</button>
        </div>
        ${r ? `<p class="note" style="margin-top:6px">Risposta mandata: ${r==='si' ? 'ci sarà' : 'non ci sarà'}. Potete cambiarla.</p>` : '<p class="note" style="margin-top:6px">Fate sapere al mister se ci sarà.</p>'}` : '<p class="note">Per questa partita non è convocato.</p>'}
    </div>`;
  };
  const avvisi = (F.avvisi||[]).slice().sort((a,b) => (b.data||'').localeCompare(a.data||''));
  const prossima = (F.calendario||[]).filter(m => m.date && m.date >= oggi).sort((a,b) => (a.date+(a.time||'')).localeCompare(b.date+(b.time||'')))[0];
  return `${cert}
    ${conv.length ? conv.map(scheda).join('') : `<div class="hcard hwide"><div class="hlabel">Convocazioni</div><p class="note">Nessuna convocazione per ora.${prossima ? ` Prossima partita della squadra: ${weekday(prossima.date)} ${fmtDate(prossima.date)} · ${esc(prossima.opponent||'')}.` : ''}</p></div>`}
    ${avvisi.length ? `<div class="hcard hwide havvisi"><div class="hlabel">Avvisi della società</div>${avvisi.slice(0,3).map(a => `<div class="gval gseg avviso"><div class="note">${fmtDate(a.data)}</div>${a.titolo ? `<b>${esc(a.titolo)}</b>` : ''}<p class="gtxt" style="white-space:pre-line">${esc(a.testo)}</p></div>`).join('')}</div>` : ''}`;
}
function viewFamigliaCalendario(){
  const oggi = todayISO();
  const ms = (F.calendario||[]).map(m => ({...m, team: F.squadra}))
    .concat((F.eventi||[]).map(eventoCome)).filter(m => !m.date || m.date >= oggi)
    .sort((a,b) => ((a.date||'')+(a.time||'').padStart(5,'0')).localeCompare((b.date||'')+(b.time||'').padStart(5,'0')));
  return `<section class="panel"><h2>Calendario · ${esc(F.squadra?.category || '')}</h2>${legendaCal()}
    ${ms.length ? `<ul class="wklist callist">${listaCalendario(ms, false)}</ul>` : '<p class="empty">Nessuna partita in programma.</p>'}</section>`;
}
function viewFamigliaAnagrafica(){
  const r = F.ragazzo || {}, d = famBozza || F.dati || {};
  const f = (k, l, tipo='text') => `<div><label class="f">${l}</label><input type="${tipo}" data-famf="${k}" value="${esc(d[k] ?? '')}"></div>`;
  return `<section class="panel"><h2>${esc(r.nome || '')}</h2>
    <div class="grid">
      <div><label class="f">Squadra</label><input value="${esc(F.squadra?.category || '')}" readonly></div>
      <div><label class="f">Data di nascita</label><input value="${esc(fmtDate(r.data_nascita) || '—')}" readonly></div>
      <div><label class="f">Ruolo</label><input value="${esc(r.ruolo ? r.ruolo[0].toUpperCase() + r.ruolo.slice(1) : '—')}" readonly></div>
      <div><label class="f">Numero</label><input value="${esc(r.numero ?? '—')}" readonly></div>
    </div>
    <h3 class="convh3" style="margin-top:16px">Contatti dei genitori e taglie</h3>
    <p class="hint">Teneteli aggiornati: servono al mister e alla segreteria.</p>
    <div class="grid">${f('genitore1_nome','Genitore 1')}${f('genitore1_tel','Telefono','tel')}${f('genitore1_email','Email','email')}
      ${f('genitore2_nome','Genitore 2')}${f('genitore2_tel','Telefono','tel')}${f('genitore2_email','Email','email')}
      ${f('taglia_divisa','Taglia divisa')}${f('taglia_tuta','Taglia tuta')}</div>
    <div class="row" style="margin-top:12px"><button class="btn primary" data-famsalva="1" ${famBozza ? '' : 'disabled'}>Salva</button>${famBozza ? '<span class="note">Modifiche da salvare</span>' : ''}</div>
  </section>`;
}
function viewFamigliaSegreteria(){
  const d = F.dati || {}, g = giorniA(d.certificato_scadenza), quote = d.quote || [];
  return `<section class="panel"><h2>Segreteria</h2>
    <div class="kpis">
      <div class="kpi"><b>${d.iscrizione_completa ? '✓' : '—'}</b><span>${d.iscrizione_completa ? 'Iscrizione completata' : 'Iscrizione da completare'}</span>${d.documenti_mancanti ? `<small>Mancano: ${esc(d.documenti_mancanti)}</small>` : ''}</div>
      <div class="kpi"><b>${d.certificato_scadenza ? fmtDate(d.certificato_scadenza) : '—'}</b><span>Certificato medico valido fino al</span>${g != null && g < 0 ? '<small class="lowc">Scaduto</small>' : g != null && g <= 30 ? '<small>In scadenza</small>' : ''}</div>
    </div>
    <h3 class="convh3" style="margin-top:16px">Quote</h3>
    ${quote.length ? `<div class="tblwrap"><table class="stbl"><thead><tr><th class="nm">Rata</th><th>Importo</th><th>Scadenza</th><th>Stato</th></tr></thead><tbody>
      ${quote.map(q => `<tr><td class="nm">${esc(q.rata||'')}</td><td>${q.importo ? '€ '+esc(q.importo) : ''}</td><td>${fmtDate(q.scadenza)}</td><td>${q.pagata ? '✓ Pagata' : '<b>Da pagare</b>'}</td></tr>`).join('')}</tbody></table></div>`
      : '<p class="note">Nessuna rata registrata.</p>'}
    <p class="note" style="margin-top:10px">Per dubbi su iscrizione e quote rivolgetevi alla segreteria della società.</p>
  </section>
  ${viewFamigliaDocumenti()}`;
}
/* ---------- Documenti: la famiglia carica visita medica, contabile di bonifico (per una rata), altro (0033) ---------- */
const TIPI_DOC = {visita_medica:'Visita medica', bonifico:'Contabile di bonifico', altro:'Altro documento'};
const STATI_DOC = {da_controllare:'Da controllare', accettato:'Accettato', rifiutato:'Rifiutato'};
let famDoc = {tipo:'visita_medica', rata:'', descrizione:''}, famCarico = false;
function viewFamigliaDocumenti(){
  const quote = (F.dati?.quote || []).map((q, i) => ({...q, i})).filter(q => !q.pagata);
  const docs = F.documenti || [];
  return `<section class="panel">
    <h2>Documenti</h2>
    <p class="hint">Caricate qui la visita medica, la contabile del bonifico di una rata o altri documenti richiesti: basta una foto chiara o un PDF. La segreteria li controlla.</p>
    <div class="grid">
      <div><label class="f" for="fd_tipo">Documento</label><select id="fd_tipo" data-famdoc="tipo">${Object.entries(TIPI_DOC).map(([k,l]) => `<option value="${k}" ${k===famDoc.tipo?'selected':''}>${l}</option>`).join('')}</select></div>
      ${famDoc.tipo==='bonifico' ? `<div><label class="f" for="fd_rata">Rata pagata</label><select id="fd_rata" data-famdoc="rata"><option value="">Scegli la rata</option>${quote.map(q => `<option value="${q.i}" ${String(q.i)===String(famDoc.rata)?'selected':''}>${esc(q.rata||'Rata '+(q.i+1))}${q.importo ? ' · € '+esc(q.importo) : ''}</option>`).join('')}</select></div>` : ''}
      <div><label class="f" for="fd_desc">Descrizione (facoltativa)</label><input id="fd_desc" data-famdoc="descrizione" value="${esc(famDoc.descrizione)}" placeholder="Es. certificato agonistico"></div>
    </div>
    <label class="f" for="fd_file" style="margin-top:8px">File</label>
    <input id="fd_file" type="file" accept="image/jpeg,image/png,application/pdf">
    <div class="row" style="margin-top:10px"><button class="btn primary" data-famcarica="1" ${famCarico ? 'disabled' : ''}>${famCarico ? 'Caricamento…' : 'Carica documento'}</button></div>
    ${docs.length ? `<h3 class="convh3" style="margin-top:16px">Caricati</h3>${docs.map(d => `<div class="docrow st-${d.stato}">
      <div><b>${esc(TIPI_DOC[d.tipo] || d.tipo)}</b>${d.tipo==='bonifico' && d.rata != null ? ` · ${esc((F.dati?.quote||[])[d.rata]?.rata || 'rata '+(d.rata+1))}` : ''}${d.descrizione ? ' · '+esc(d.descrizione) : ''}
        <div class="note">${esc(d.nome_file)} · ${fmtDate(String(d.caricato_il).slice(0,10))}${d.nota ? ' · '+esc(d.nota) : ''}</div></div>
      <span class="sbadge ${d.stato==='accettato' ? 'c-ok' : d.stato==='rifiutato' ? 'c-scaduto' : 'c-scade'}">${STATI_DOC[d.stato]}</span></div>`).join('')}` : ''}
  </section>`;
}
/* Foto ridotte sul telefono (lato lungo 1600 px, JPEG) prima dell'invio; PDF così come sono (max 4 MB) */
function fileInBase64(file){
  return new Promise((ok, ko) => {
    if(file.type === 'application/pdf'){
      if(file.size > 4*1024*1024) return ko(new Error('Il PDF è troppo grande (massimo 4 MB).'));
      const r = new FileReader(); r.onload = () => ok({mime:'application/pdf', b64:String(r.result).split(',')[1]}); r.onerror = () => ko(new Error('File non leggibile.')); r.readAsDataURL(file); return;
    }
    if(!/^image\//.test(file.type)) return ko(new Error('Carica una foto o un PDF.'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok({mime:'image/jpeg', b64:c.toDataURL('image/jpeg', 0.82).split(',')[1]});
    };
    img.onerror = () => ko(new Error('Foto non leggibile: prova in JPG.'));
    img.src = url;
  });
}
async function caricaDocumentoFamiglia(){
  const file = $('#fd_file')?.files?.[0];
  if(!file){ setStatus('Scegli il file da caricare'); return; }
  if(famDoc.tipo==='bonifico' && famDoc.rata===''){ setStatus('Scegli la rata pagata'); return; }
  famCarico = true; render();
  try{
    const {mime, b64} = await fileInBase64(file);
    const nome = file.name.replace(/\.(heic|heif|png|jpe?g)$/i, '') + (mime==='application/pdf' ? '' : '.jpg');
    const { error } = await supabaseClient.rpc('famiglia_carica', { p_pin: famPin, p_tipo: famDoc.tipo, p_rata: famDoc.rata==='' ? null : +famDoc.rata,
      p_descrizione: famDoc.descrizione, p_nome_file: nome, p_mime: mime, p_base64: b64 });
    if(error) throw error;
    famDoc = {tipo:'visita_medica', rata:'', descrizione:''}; setStatus('Documento caricato: la segreteria lo controllerà');
    await aggiornaFamiglia(true);
  }catch(e){ setStatus(e.message || 'Documento non caricato: riprova'); }
  famCarico = false; render();
}
const FAM_TABS = [['home','Home'],['calendario','Calendario'],['anagrafica','Anagrafica'],['segreteria','Segreteria']];
function renderFamiglia(){
  aggiornaFamiglia();
  $('#demo').innerHTML = ''; $('#demo').classList.add('hidden');
  $('#ctx').innerHTML = `<span class="badge coach">Famiglia</span><span class="teamname">${esc(F.ragazzo?.nome || '')}</span><button class="logout" data-act="logout">Esci</button>`;
  $('#matchline').textContent = F.squadra?.category || '';
  $('#areanav').classList.add('hidden'); $('#subtabs').classList.add('hidden');
  $('#tabs').innerHTML = FAM_TABS.map(([k,l]) => `<button class="tab" data-famtab="${k}" aria-selected="${k===famTab}">${l}</button>`).join('');
  $('#tabs').classList.remove('hidden');
  $('#view').innerHTML = famTab==='calendario' ? viewFamigliaCalendario() : famTab==='anagrafica' ? viewFamigliaAnagrafica()
    : famTab==='segreteria' ? viewFamigliaSegreteria() : `<section class="hhead"><h2>${esc(F.ragazzo?.nome || '')}</h2><p class="note">${esc(F.squadra?.category || '')}</p></section><div class="hgrid">${viewFamigliaHome()}</div>`;
}
document.addEventListener('click', async e => {
  if(ROLE !== 'famiglia') return;
  const b = e.target.closest('[data-famtab],[data-famrisp],[data-famsalva],[data-famcarica]'); if(!b) return;
  if(b.dataset.famcarica){ caricaDocumentoFamiglia(); return; }
  if(b.dataset.famtab){ famTab = b.dataset.famtab; render(); window.scrollTo(0,0); return; }
  if(b.dataset.famrisp){
    const k = b.dataset.famrisp, v = b.dataset.v;
    const { error } = await supabaseClient.rpc('famiglia_rispondi', { p_pin: famPin, p_partita: k, p_risposta: v, p_nota: '' });
    if(error){ setStatus('Risposta non mandata: riprova'); return; }
    (F.risposte ||= {})[k] = {risposta: v}; setStatus('Risposta mandata al mister'); render(); return;
  }
  if(b.dataset.famsalva && famBozza){
    const { error } = await supabaseClient.rpc('famiglia_contatti', { p_pin: famPin, p_dati: famBozza });
    if(error){ setStatus('Non salvato: riprova'); return; }
    F.dati = {...(F.dati||{}), ...famBozza}; famBozza = null; setStatus('Salvato'); render();
  }
});
document.addEventListener('change', e => {
  if(ROLE !== 'famiglia' || !e.target.dataset?.famdoc) return;
  famDoc[e.target.dataset.famdoc] = e.target.value; if(e.target.dataset.famdoc === 'tipo') render();
});
document.addEventListener('input', e => {
  if(ROLE === 'famiglia' && e.target.dataset?.famdoc === 'descrizione'){ famDoc.descrizione = e.target.value; return; }
  if(ROLE !== 'famiglia' || !e.target.dataset?.famf) return;
  famBozza ||= {...(F.dati||{})}; famBozza[e.target.dataset.famf] = e.target.value;
  const s = $('[data-famsalva]'); if(s) s.disabled = false;
});
