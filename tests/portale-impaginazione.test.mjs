// Impaginazione automatica dei PDF del Portale (pdf.js: foglio gara; quella dei moduli è nell'app, tests/pdf-moduli.test.mjs): i file si caricano in un ambiente finto
// (niente browser), con una "pagina" che misura il testo in modo semplice (larghezza = lettere × grandezza).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const contesto = vm.createContext({ document: { addEventListener() {} }, window: {}, console });
for (const f of ['pdf.js']) vm.runInContext(readFileSync(`public/portale/js/${f}`, 'utf8'), contesto, { filename: f });
const P = vm.runInContext('({ righeTesto, taglia, testoInRiquadro })', contesto);

/* tela finta (canvas del foglio gara) */
function telaFinta() {
  let size = 14; const scritte = [];
  return { scritte, set font(f) { size = parseFloat(String(f).match(/(\d+(?:\.\d+)?)px/)[1]); }, get font() { return `${size}px`; },
    measureText: (t) => ({ width: String(t).length * size * 0.5 }), fillText(t) { scritte.push({ t, size }); }, strokeText() {}, fillStyle: '', textAlign: '', textBaseline: '' };
}

test('foglio gara: testo in un riquadro non esce mai (grandezza minore o "…")', () => {
  const x = telaFinta();
  const h = P.testoInRiquadro(x, 'Riscaldamento alle 9:45. '.repeat(30), 0, 0, 260, 120, { size: 15, min: 11 });
  assert.ok(h <= 120, `altezza ${h} oltre il riquadro`);
  assert.ok(x.scritte.at(-1).t.endsWith('…'));
  assert.ok(x.scritte.every((s) => s.t.length * s.size * 0.5 <= 260 + 0.01), 'nessuna riga più larga del riquadro');
  assert.equal(P.taglia(x, 'breve', 200), 'breve');
});
