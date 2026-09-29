/* Portale · Eventi e avvisi della società letti per la Home (mister, organizzativo) e per le famiglie. Si scrivono
   nell'app dalla tappa 3: /calendari/tutte (eventi, amichevoli di tutte le squadre, Google) e /calendari/avvisi.
   Documenti: shared/eventi {items:[{id, titolo, tipo, data, inizio, fine, luogo:'merate'|'cernusco'|'altro', indirizzo,
   squadre:[id], note}]}, shared/avvisi {items:[{id, data, squadre:[id], titolo, testo, autore}]} (squadre vuote = tutta la società). */

/* ---------- Dati condivisi: eventi e avvisi ---------- */
let eventiSoc = [], avvisiSoc = [], condivisiAt = 0, condivisiInCorso = false;
/* Calendario, eventi e avvisi: admin, direttori (0034) e responsabile organizzativo (0029) */
const puoOrganizzare = () => isOrg() || isAdmin();
async function caricaCondivisi(forza){
  if(!db || condivisiInCorso || (!forza && Date.now() - condivisiAt < 60000)) return;
  condivisiInCorso = true;
  const leggi = p => db.doc(p).get().then(s => (s.exists && s.data()?.items) || []).catch(() => null);
  const [ev, av] = await Promise.all([leggi('shared/eventi'), leggi('shared/avvisi')]);
  if(ev) eventiSoc = ev;
  if(av) avvisiSoc = av;
  condivisiAt = Date.now(); condivisiInCorso = false;
  if(['home','calendario','calendariotutte','avvisi'].includes(tab)) render();
}

/* ---------- Eventi come righe di calendario (colonna del luogo, etichetta del tipo) ---------- */
const TIPI_EVENTO = ['Torneo organizzato','Open day','Festa','Riunione','Altro'];
const LUOGHI_EVENTO = {merate:'Campo di Merate', cernusco:'Campo di Cernusco', altro:'Altrove'};
const eventoCome = e => ({id:'ev_'+e.id, evento:e, date:e.data, time:e.inizio||'', fine:e.fine||'', opponent:e.titolo||'Evento',
  home:e.luogo!=='altro', luogo:e.luogo, venue:e.luogo==='altro' ? (e.indirizzo||'') : LUOGHI_EVENTO[e.luogo], tipo:e.tipo||'Evento', note:e.note||''});
/* Eventi di una squadra: quelli che la coinvolgono, o di tutta la società (nessuna squadra indicata) */
const eventiPer = teamId => { caricaCondivisi(); return eventiSoc.filter(e => !(e.squadre||[]).length || e.squadre.includes(teamId)).map(eventoCome); };
const eventiTutti = () => { caricaCondivisi(); return eventiSoc.map(eventoCome); };
const squadreTesto = ids => (ids||[]).length ? ids.map(id => siglaSquadra(S.teams.find(t => t.id===id) || (tuttiCal||[]).find(t => t.id===id))).filter(Boolean).join(', ') : 'Tutta la società';

/* ---------- Avvisi (Comunicazioni): per una o più squadre, solo nell'app (Home di mister e famiglie; niente WhatsApp) ---------- */
/* Avvisi ed eventi si scrivono nell'app (/calendari/avvisi, /calendari/tutte); qui si leggono per la Home */
/* Avvisi per la squadra aperta (Home dei mister): ultimi 14 giorni */
function avvisiSquadra(teamId){
  caricaCondivisi();
  const da = new Date(todayISO()+'T12:00:00'); da.setDate(da.getDate() - 14);
  const limite = da.toISOString().slice(0,10);
  return avvisiSoc.filter(a => (a.data||'') >= limite && (!(a.squadre||[]).length || a.squadre.includes(teamId))).sort((x,y) => (y.data||'').localeCompare(x.data||''));
}
