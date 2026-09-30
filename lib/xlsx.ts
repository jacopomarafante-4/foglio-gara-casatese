// Lettura di un file Excel (.xlsx) senza librerie esterne: è uno zip di file XML. Si prende il primo foglio e se ne
// restituiscono le celle come testo (date e ore restano numeri di Excel: le traducono leggiData/leggiOra). Va nel browser
// e in Node (DecompressionStream), niente DOM: l'XML si legge con espressioni regolari, basta per i fogli semplici.

const entita = (s: string) => s.replace(/&(amp|lt|gt|quot|apos|#\d+|#x[0-9a-f]+);/gi, (_, e: string) =>
  ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" } as Record<string, string>)[e.toLowerCase()]
  ?? String.fromCodePoint(e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)));

/** I file dentro lo zip (nome → contenuto come testo) */
async function apriZip(dati: Uint8Array): Promise<Map<string, () => Promise<string>>> {
  const dv = new DataView(dati.buffer, dati.byteOffset, dati.byteLength);
  let fine = -1;
  for (let i = dati.length - 22; i >= Math.max(0, dati.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { fine = i; break; }
  if (fine < 0) throw new Error('Non è un file Excel (.xlsx) valido.');
  const quanti = dv.getUint16(fine + 10, true);
  let p = dv.getUint32(fine + 16, true);
  const file = new Map<string, () => Promise<string>>();
  for (let n = 0; n < quanti; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) break;
    const metodo = dv.getUint16(p + 10, true), dim = dv.getUint32(p + 20, true);
    const lNome = dv.getUint16(p + 28, true), lExtra = dv.getUint16(p + 30, true), lComm = dv.getUint16(p + 32, true);
    const locale = dv.getUint32(p + 42, true);
    const nome = new TextDecoder().decode(dati.subarray(p + 46, p + 46 + lNome));
    file.set(nome, async () => {
      const inizio = locale + 30 + dv.getUint16(locale + 26, true) + dv.getUint16(locale + 28, true);
      const pezzo = dati.slice(inizio, inizio + dim);
      if (metodo === 0) return new TextDecoder().decode(pezzo);
      const flusso = new Blob([pezzo]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(flusso).arrayBuffer());
    });
    p += 46 + lNome + lExtra + lComm;
  }
  return file;
}

const colonna = (rif: string) => [...rif.replace(/\d+/g, '')].reduce((n, c) => n * 26 + c.charCodeAt(0) - 64, 0) - 1;

/** Il primo foglio del file come tabella di testi */
export async function leggiXlsx(dati: Uint8Array): Promise<string[][]> {
  const zip = await apriZip(dati);
  const leggi = async (n: string) => (zip.get(n) ? await zip.get(n)!() : '');
  // primo foglio: dall'elenco dei fogli e dai collegamenti del libro (se no sheet1.xml)
  const libro = await leggi('xl/workbook.xml'), link = await leggi('xl/_rels/workbook.xml.rels');
  const rid = libro.match(/<sheet\b[^>]*\br:id="([^"]+)"/)?.[1];
  const dest = rid ? link.match(new RegExp(`<Relationship\\b[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))?.[1]
    ?? link.match(new RegExp(`<Relationship\\b[^>]*Target="([^"]+)"[^>]*Id="${rid}"`))?.[1] : undefined;
  const foglio = await leggi(dest ? 'xl/' + dest.replace(/^\/?xl\//, '').replace(/^\//, '') : 'xl/worksheets/sheet1.xml');
  if (!foglio) throw new Error('Nel file Excel non trovo il primo foglio.');
  const condivisi = [...(await leggi('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)]
    .map((m) => entita([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const righe: string[][] = [];
  for (const r of foglio.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)) {
    const riga: string[] = [];
    for (const c of r[1].matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attr = c[1], corpo = c[2] ?? '';
      const rif = attr.match(/\br="([A-Z]+)\d+"/)?.[1];
      const tipo = attr.match(/\bt="(\w+)"/)?.[1];
      const v = corpo.match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
      const testo = tipo === 's' ? condivisi[Number(v)] ?? ''
        : tipo === 'inlineStr' ? entita([...corpo.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')) : entita(v);
      riga[rif ? colonna(rif) : riga.length] = testo;
    }
    righe.push(Array.from(riga, (x) => x ?? ''));
  }
  return righe;
}
