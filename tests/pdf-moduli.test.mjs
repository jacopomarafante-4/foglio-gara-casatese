// Impaginazione dei PDF della Modulistica nell'app (lib/pdf-moduli.ts) e regole della distinta (lib/distinta.ts):
// stesse prove di portale-impaginazione.test.mjs, con una "pagina" che misura il testo in modo semplice.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { riga1, misuraBlocco, paragrafi, perPdf } from '@/lib/pdf-moduli';
import { numeroPartita, categoriaDistinta, distintaNuova, nomiMister } from '@/lib/distinta';

function paginaFinta() {
  let size = 10; const scritte = [];
  const w = (t) => String(t).length * size * 0.18;
  return {
    scritte, setFont() {}, setFontSize(s) { size = s; }, getTextWidth: w,
    splitTextToSize(t, max) { const out = []; let r = ''; for (const p of String(t).split(/\s+/)) { const x = r ? r + ' ' + p : p; if (w(x) > max && r) { out.push(r); r = p; } else r = x; } out.push(r); return out; },
    text(t, x, y) { scritte.push({ t, x, y, size }); },
  };
}

test('perPdf toglie emoji e simboli che il PDF non sa scrivere', () => {
  assert.equal(perPdf('⚠️ CAMBIO ORARIO'), ' CAMBIO ORARIO');
  assert.equal(perPdf('Città – “virgolette” €'), 'Città – “virgolette” €');
});

test('una riga lunga prima rimpicciolisce, poi finisce con "…"', () => {
  const d = paginaFinta();
  assert.equal(riga1(d, 'Torneo breve', 0, 0, 100, { size: 11, min: 7 }), 11);
  riga1(d, 'Torneo Internazionale Città di Merate Memorial 2026', 0, 0, 50, { size: 11, min: 7 });
  assert.equal(d.scritte.at(-1).size, 7);
  assert.ok(d.scritte.at(-1).t.endsWith('…'));
});

test('un blocco sta nelle righe concesse', () => {
  const b = misuraBlocco(paginaFinta(), 'parola '.repeat(80), 60, { size: 10, min: 8, maxRighe: 2 });
  assert.equal(b.righe.length, 2);
  assert.ok(b.righe[1].endsWith('…'));
});

test('paragrafi, elenchi puntati e numerati', () => {
  const pp = paragrafi(paginaFinta(), 'Premessa.\n\n- borraccia\n- scarpe\n\n9. nono\n10. decimo', 180, 11);
  assert.equal(pp.length, 3);
  assert.equal(pp[1].righe[0].punto, '•');
  assert.equal(pp[2].righe[0].punto, '9.');
  assert.equal(pp[2].righe[0].rientro, pp[2].righe[1].rientro);
});

test('distinta: numero dalla formazione della partita, categoria senza "Attività di base"', () => {
  const f = { lineup: { 1: 'p1', 7: 'p7' }, bench: ['p12', 'p13'] };
  assert.equal(numeroPartita(f, 'p7'), '7');
  assert.equal(numeroPartita(f, 'p13'), '13');
  assert.equal(numeroPartita(f, 'altro'), '');
  assert.equal(categoriaDistinta('Under 11 - Attività di base', false), 'Under 11');
  assert.equal(categoriaDistinta('Under 14', true), '');
  const d = distintaNuova(nomiMister({ coaches: [{ name: 'Rossi' }, { name: 'Bianchi' }] }));
  assert.equal(d.staff[0].nome, 'Rossi, Bianchi');
});
