// Scrittura di un file Excel (.xlsx) senza librerie esterne (il gemello di lib/xlsx.ts): uno zip "senza compressione" di file XML.
// Più fogli, prima riga in grassetto e bloccata, filtro sulle colonne, larghezze dal contenuto; numeri come numeri, il resto come
// testo. Va nel browser e in Node. Provato in tests/xlsx-scrivi.test.mjs (rilettura con lib/xlsx.ts).

export type Cella = string | number | null | undefined;
export type Foglio = { nome: string; righe: Cella[][] };

const xml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '');
const colonna = (i: number) => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
/** Nome del foglio come lo vuole Excel: niente : \ / ? * [ ], al massimo 31 caratteri, senza doppioni */
function nomiFogli(fogli: Foglio[]) {
  const usati = new Set<string>();
  return fogli.map((f, i) => {
    let n = (f.nome || `Foglio ${i + 1}`).replace(/[:\\/?*[\]]/g, ' ').trim().slice(0, 31) || `Foglio ${i + 1}`;
    for (let k = 2; usati.has(n.toLowerCase()); k++) n = `${n.slice(0, 27)} (${k})`;
    usati.add(n.toLowerCase());
    return n;
  });
}

function foglioXml(f: Foglio) {
  const larghezze: number[] = [];
  for (const r of f.righe) r.forEach((c, j) => { larghezze[j] = Math.max(larghezze[j] ?? 6, Math.min(60, String(c ?? '').length + 2)); });
  const ultima = colonna(Math.max(0, larghezze.length - 1)) + Math.max(1, f.righe.length);
  const righe = f.righe.map((r, i) => `<row r="${i + 1}">${r.map((c, j) => {
    if (c === null || c === undefined || c === '') return '';
    const rif = `${colonna(j)}${i + 1}`, stile = i === 0 ? ' s="1"' : '';
    return typeof c === 'number' && Number.isFinite(c) ? `<c r="${rif}"${stile}><v>${c}</v></c>`
      : `<c r="${rif}"${stile} t="inlineStr"><is><t xml:space="preserve">${xml(String(c))}</t></is></c>`;
  }).join('')}</row>`).join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + (f.righe.length > 1 ? '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' : '')
    + (larghezze.length ? `<cols>${larghezze.map((w, j) => `<col min="${j + 1}" max="${j + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>` : '')
    + `<sheetData>${righe}</sheetData>`
    + (f.righe.length > 1 && larghezze.length ? `<autoFilter ref="A1:${ultima}"/>` : '')
    + '</worksheet>';
}

/* ---------- zip senza compressione ---------- */
const TAB = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (d: Uint8Array) => { let c = 0xffffffff; for (const b of d) c = TAB[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function zip(file: [string, string][]) {
  const enc = new TextEncoder(), parti: Uint8Array[] = [], centrale: Uint8Array[] = [];
  let pos = 0;
  for (const [nome, testo] of file) {
    const n = enc.encode(nome), d = enc.encode(testo), crc = crc32(d);
    const loc = new Uint8Array(30 + n.length), v = new DataView(loc.buffer);
    v.setUint32(0, 0x04034b50, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
    v.setUint32(14, crc, true); v.setUint32(18, d.length, true); v.setUint32(22, d.length, true); v.setUint16(26, n.length, true);
    loc.set(n, 30);
    const cen = new Uint8Array(46 + n.length), w = new DataView(cen.buffer);
    w.setUint32(0, 0x02014b50, true); w.setUint16(4, 20, true); w.setUint16(6, 20, true); w.setUint16(8, 0x0800, true);
    w.setUint32(16, crc, true); w.setUint32(20, d.length, true); w.setUint32(24, d.length, true); w.setUint16(28, n.length, true);
    w.setUint32(42, pos, true); cen.set(n, 46);
    parti.push(loc, d); centrale.push(cen); pos += loc.length + d.length;
  }
  const dimC = centrale.reduce((a, c) => a + c.length, 0), fine = new Uint8Array(22), f = new DataView(fine.buffer);
  f.setUint32(0, 0x06054b50, true); f.setUint16(8, file.length, true); f.setUint16(10, file.length, true);
  f.setUint32(12, dimC, true); f.setUint32(16, pos, true);
  const tutto = new Uint8Array(pos + dimC + 22);
  let p = 0; for (const x of [...parti, ...centrale, fine]) { tutto.set(x, p); p += x.length; }
  return tutto;
}

/** Il file Excel coi fogli dati */
export function creaXlsx(fogli: Foglio[]): Uint8Array {
  const nomi = nomiFogli(fogli.length ? fogli : [{ nome: 'Foglio 1', righe: [] }]);
  const elenco = fogli.length ? fogli : [{ nome: nomi[0], righe: [] }];
  return zip([
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + elenco.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')
      + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" '
      + 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + nomi.map((n, i) => `<sheet name="${xml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets>'
      + (elenco.some((f) => f.righe.length > 1) ? `<definedNames>${elenco.map((f, i) => f.righe.length > 1
        ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">'${xml(nomi[i].replace(/'/g, "''"))}'!$A$1:$${colonna(Math.max(0, Math.max(...f.righe.map((r) => r.length)) - 1))}$${f.righe.length}</definedName>` : '').join('')}</definedNames>` : '')
      + '</workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + elenco.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
      + `<Relationship Id="rId${elenco.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      + '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      + '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      + '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
    ...elenco.map((f, i) => [`xl/worksheets/sheet${i + 1}.xml`, foglioXml(f)] as [string, string]),
  ]);
}
