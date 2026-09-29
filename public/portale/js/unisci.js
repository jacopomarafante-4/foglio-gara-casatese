/* Portale · Unione di due modifiche fatte in contemporanea sulla stessa scheda (0048).
   base = la scheda com'era quando l'ho aperta, mio = com'è per me adesso, loro = com'è ora nel database.
   Si tiene tutto quello che è cambiato da una sola parte; se la stessa cosa è cambiata da tutte e due, vince la mia
   (chi salva adesso). Gli elenchi di oggetti con id (giocatori, partite, allenamenti, squadre, schemi…) si uniscono
   voce per voce: aggiunte e tolte da entrambe le parti restano. Nessun'altra dipendenza: si prova in tests/. */
const unisciUguali = (a, b) => JSON.stringify(ordinaChiavi(a)) === JSON.stringify(ordinaChiavi(b));
function ordinaChiavi(v){
  if(Array.isArray(v)) return v.map(ordinaChiavi);
  if(v && typeof v === 'object') return Object.keys(v).sort().reduce((o, k) => (o[k] = ordinaChiavi(v[k]), o), {});
  return v;
}
const oggetto = v => !!v && typeof v === 'object' && !Array.isArray(v);
const elencoConId = v => Array.isArray(v) && v.length > 0 && v.every(x => oggetto(x) && x.id != null);

function unisci(base, mio, loro){
  if(unisciUguali(mio, base)) return loro;
  if(unisciUguali(loro, base) || unisciUguali(mio, loro)) return mio;
  if(oggetto(mio) && oggetto(loro)){
    const b = oggetto(base) ? base : {}, out = {};
    for(const k of new Set([...Object.keys(loro), ...Object.keys(mio)])){
      const inMio = k in mio, inLoro = k in loro, inBase = k in b;
      if(!inMio && inBase && unisciUguali(loro[k], b[k])) continue;      // tolta da me, loro non l'hanno toccata
      if(!inLoro && inBase && unisciUguali(mio[k], b[k])) continue;      // tolta da loro, io non l'ho toccata
      const v = unisci(b[k], inMio ? mio[k] : undefined, inLoro ? loro[k] : undefined);
      if(v !== undefined) out[k] = v;
    }
    return out;
  }
  const vuotoOId = v => (Array.isArray(v) && v.length === 0) || elencoConId(v);
  if(vuotoOId(mio) && vuotoOId(loro) && (elencoConId(mio) || elencoConId(loro))){
    const perId = a => new Map((Array.isArray(a) ? a : []).filter(oggetto).map(x => [String(x.id), x]));
    const B = perId(base), M = perId(mio), L = perId(loro), out = [];
    const tieni = id => {
      const b = B.get(id), m = M.get(id), l = L.get(id);
      if(!m && !l) return;
      if(!m){ if(b && unisciUguali(l, b)) return; return l; }             // tolta da me (loro invariata) → via
      if(!l){ if(b && unisciUguali(m, b)) return; return m; }             // tolta da loro (mia invariata) → via
      return unisci(b, m, l);
    };
    /* ordine: quello di loro, poi le mie voci nuove al loro posto */
    const ids = [...L.keys()];
    [...M.keys()].forEach((id, i, arr) => { if(!L.has(id)){ const prima = arr.slice(0, i).reverse().find(x => ids.includes(x)); ids.splice(prima ? ids.indexOf(prima) + 1 : 0, 0, id); } });
    ids.forEach(id => { const v = tieni(id); if(v !== undefined) out.push(v); });
    return out;
  }
  return mio === undefined ? loro : mio;
}
