// Impaginazione automatica dei PDF del Portale (modulistica.js e pdf.js): i file si caricano in un ambiente finto
// (niente browser), con una "pagina" che misura il testo in modo semplice (larghezza = lettere × grandezza).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ document: { addEventListener() {} }, window: {}, console });
for (const f of ['pdf.js', 'modulistica.js']) vm.runInContext(readFileSync(`public/portale/js/${f}`, 'utf8'), contesto, { filename: f });
const P = vm.runInContext('({ riga1, misuraBlocco, paragrafi, perPdf, righeTesto, taglia, testoInRiquadro })', contesto);

/* pagina PDF finta (jsPDF): larghezza di un testo = lettere × grandezza × 0,18 mm */
function paginaFinta() {
  let size = 10; const scritte = [];
  const w = (t) => String(t).length * size * 0.18;
  return {
    scritte, setFont() {}, setFontSize(s) { size = s; }, getTextWidth: w,
    splitTextToSize(t, max) { const out = []; let r = ''; for (const p of String(t).split(/\s+/)) { const x = r ? r + ' ' + p : p; if (w(x) > max && r) { out.push(r); r = p; } else r = x; } out.push(r); return out; },
    text(t, x, y) { scritte.push({ t, x, y, size }); },
  };
}
/* tela finta (canvas del foglio gara) */
function telaFinta() {
  let size = 14; const scritte = [];
  return { scritte, set font(f) { size = parseFloat(String(f).match(/(\d+(?:\.\d+)?)px/)[1]); }, get font() { return `${size}px`; },
    measureText: (t) => ({ width: String(t).length * size * 0.5 }), fillText(t) { scritte.push({ t, size }); }, strokeText() {}, fillStyle: '', textAlign: '', textBaseline: '' };
}

test('perPdf toglie emoji e simboli che il PDF non sa scrivere', () => {
  assert.equal(P.perPdf('⚠️ CAMBIO ORARIO'), ' CAMBIO ORARIO');
  assert.equal(P.perPdf('Città – “virgolette” €'), 'Città – “virgolette” €');
});

test('una riga lunga prima rimpicciolisce, poi finisce con "…"', () => {
  const d = paginaFinta();
  const s = P.riga1(d, 'Torneo breve', 0, 0, 100, { size: 11, min: 7 });
  assert.equal(s, 11, 'se ci sta resta grande');
  P.riga1(d, 'Torneo Internazionale Città di Merate Memorial 2026', 0, 0, 50, { size: 11, min: 7 });
  const ultima = d.scritte.at(-1);
  assert.equal(ultima.size, 7, 'scende fino al minimo');
  assert.ok(ultima.t.endsWith('…'), 'e poi taglia con i puntini');
});

test('un blocco sta nelle righe concesse', () => {
  const d = paginaFinta();
  const b = P.misuraBlocco(d, 'parola '.repeat(80), 60, { size: 10, min: 8, maxRighe: 2 });
  assert.equal(b.righe.length, 2);
  assert.ok(b.righe[1].endsWith('…'));
});

test('paragrafi, elenchi puntati e numerati', () => {
  const d = paginaFinta();
  const pp = P.paragrafi(d, 'Premessa.\n\n- borraccia\n- scarpe\n\n9. nono\n10. decimo', 180, 11);
  assert.equal(pp.length, 3, 'le righe vuote separano i paragrafi');
  const [, punti, numeri] = pp;
  assert.equal(punti.righe[0].punto, '•');
  assert.equal(numeri.righe[0].punto, '9.');
  assert.equal(numeri.righe[0].rientro, numeri.righe[1].rientro, 'stesso rientro per 9 e 10');
});

test('foglio gara: testo in un riquadro non esce mai (grandezza minore o "…")', () => {
  const x = telaFinta();
  const h = P.testoInRiquadro(x, 'Riscaldamento alle 9:45. '.repeat(30), 0, 0, 260, 120, { size: 15, min: 11 });
  assert.ok(h <= 120, `altezza ${h} oltre il riquadro`);
  assert.ok(x.scritte.at(-1).t.endsWith('…'));
  assert.ok(x.scritte.every((s) => s.t.length * s.size * 0.5 <= 260 + 0.01), 'nessuna riga più larga del riquadro');
  assert.equal(P.taglia(x, 'breve', 200), 'breve');
});
