// Dati tutti inventati per il giro automatico delle schede del Portale (scripts/prove-schede.mjs): squadre, mister e PIN
// finti, rose con nomi di fantasia, calendari con date calcolate da oggi (così c'è sempre un weekend con partite).
// Nessun dato vero: il repository è pubblico e queste prove girano anche su GitHub.
import { SCHEMI, comePortale } from '../piazzati/schemi.mjs';

const giorno = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const sabato = (() => { const d = new Date(); d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7)); return d; })();
const sab = (n = 0) => { const d = new Date(sabato); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

export const SQUADRE = [
  { id: 't_p15', name: 'Academy Prova', category: 'Under 15 - Regionale', coaches: [{ id: 'm1', name: 'Mario Esempio', code: '910001' }] },
  { id: 't_p14', name: 'Academy Prova', category: 'Under 14 - Provinciale', coaches: [{ id: 'm2', name: 'Luca Esempio', code: '910002' }] },
  { id: 't_p10', name: 'Academy Prova', category: 'Under 10 - Attività di base', coaches: [{ id: 'm3', name: 'Paolo Esempio', code: '910003' }] },
  { id: 't_ppor', name: 'Preparatori portieri', category: 'Portieri', vedeTutte: true, coaches: [{ id: 'm4', name: 'Anna Esempio', code: '910004', eta: [14, 15] }] },
  { id: 't_porg', name: 'Organizzazione', category: 'Organizzazione', organizza: true, coaches: [{ id: 'm5', name: 'Sara Esempio', code: '910005' }] },
];
export const PIN = { u15: '910001', u14: '910002', u10: '910003', preparatore: '910004', organizzativo: '910005' };

const NOMI = ['Rossi Luca', 'Bianchi Marco', 'Verdi Paolo', 'Neri Andrea', 'Galli Simone', 'Conti Matteo', 'Russo Davide', 'Ferrari Tommaso',
  'Esposito Giulio', 'Romano Pietro', 'Colombo Filippo', 'Ricci Samuele', 'Marino Lorenzo', 'Greco Nicolò', 'Bruno Alessandro', 'Gallo Riccardo'];
const rosa = (pref) => NOMI.map((n, i) => ({ id: `${pref}_p${i}`, name: n, num: String(i + 1) }));

function calendario(t, casa) {
  return [
    { id: `${t}_c1`, date: giorno(-9), time: '10:30', opponent: 'Polisportiva Esempio', home: true, venue: casa },
    { id: `${t}_c2`, date: sab(0), time: '15:00', opponent: 'Sporting Fantasia', home: true, venue: casa },
    { id: `${t}_c3`, date: sab(1), time: '10:00', opponent: 'Oratorio Inventato', home: false, venue: 'Campo comunale di prova' },
    { id: `${t}_c4`, date: sab(8), time: '11:00', opponent: 'Real Immaginario', home: true, venue: casa },
  ];
}
function registro(pref, t) {
  const presenze = Object.fromEntries(rosa(pref).map((p, i) => [p.id, i % 5 === 0 ? 'A' : 'P']));
  return {
    trainings: [{ id: `${t}_a1`, date: giorno(-3), att: presenze }, { id: `${t}_a2`, date: giorno(-1), att: presenze }],
    games: [{ id: `${t}_g1`, calId: `${t}_c1`, date: giorno(-9), opponent: 'Polisportiva Esempio', home: true, comp: 'Campionato', dur: 70, og: '',
      pl: Object.fromEntries(rosa(pref).slice(0, 13).map((p, i) => [p.id, { pres: true, min: i < 11 ? 70 : 20, g: i === 9 ? 1 : 0 }])), tempi: [{ noi: 1, loro: 0 }] }],
    tests: [], gk: [`${pref}_p0`], friendlies: [], schemi: [],
  };
}
function foglio(pref) {
  const lineup = Object.fromEntries(Array.from({ length: 11 }, (_, i) => [i + 1, `${pref}_p${i}`]));
  return { formation: '1-4-4-2', lineup, bench: [`${pref}_p11`, `${pref}_p12`], captain: `${pref}_p4`, vice: `${pref}_p9`,
    opponent: 'Sporting Fantasia', date: sab(0), time: '15:00', home: true, category: 'Under 14', selected: [SCHEMI[0].id],
    overrides: {}, schemeEdits: {}, slotPos: {}, callup: Object.fromEntries(rosa(pref).slice(0, 14).map((p) => [p.id, 'CON'])), notes: 'Nota di prova.' };
}

export function datiPortale() {
  const d = {
    'shared/teams': { items: SQUADRE },
    'shared/schemes': { items: SCHEMI.slice(0, 4).map(comePortale) },
    'shared/eventi': { items: [{ id: 'e1', titolo: 'Open day di prova', tipo: 'Open day', data: sab(0), inizio: '09:00', fine: '12:00',
      luogo: 'merate', indirizzo: '', squadre: ['t_p10'], note: '' }] },
    'shared/avvisi': { items: [{ id: 'av1', data: giorno(-1), squadre: [], titolo: 'Avviso di prova', testo: 'Testo di prova per tutte le squadre.', autore: 'Società' }] },
  };
  for (const [t, pref, casa] of [['t_p15', 'a', 'C.S. COMUNALE - MERATE'], ['t_p14', 'b', 'C.S. COMUNALE - CERNUSCO'], ['t_p10', 'c', 'C.S. COMUNALE - MERATE']]) {
    d[`roster/${t}`] = { players: rosa(pref) };
    d[`calendar/${t}`] = { matches: calendario(t, casa) };
    d[`registro/${t}`] = registro(pref, t);
    d[`sheet/${t}`] = foglio(pref);
  }
  d['roster/t_ppor'] = { players: rosa('d').slice(0, 4) };
  d['registro/t_ppor'] = { trainings: [], games: [], tests: [], gk: [], friendlies: [] };
  return d;
}
