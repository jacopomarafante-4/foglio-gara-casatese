'use client';
// Famiglia → Segreteria → carica un documento (visita medica, contabile di una rata, altro). Le foto si riducono nel browser
// (lato lungo 1600 px, JPEG) prima dell'invio; i PDF vanno così come sono (massimo 4 MB). Lo controlla la segreteria.
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { caricaDocumento } from '@/app/famiglia/actions';

const TIPI = { visita_medica: 'Visita medica', bonifico: 'Contabile di bonifico', altro: 'Altro documento' } as const;

function inBase64(file: File): Promise<{ mime: string; base64: string }> {
  return new Promise((ok, ko) => {
    if (file.type === 'application/pdf') {
      if (file.size > 4 * 1024 * 1024) return ko(new Error('Il PDF è troppo grande (massimo 4 MB).'));
      const r = new FileReader();
      r.onload = () => ok({ mime: 'application/pdf', base64: String(r.result).split(',')[1] });
      r.onerror = () => ko(new Error('File non leggibile.'));
      r.readAsDataURL(file); return;
    }
    if (!/^image\//.test(file.type)) return ko(new Error('Carica una foto o un PDF.'));
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, 1600 / Math.max(img.width, img.height)), c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      ok({ mime: 'image/jpeg', base64: c.toDataURL('image/jpeg', 0.82).split(',')[1] });
    };
    img.onerror = () => ko(new Error('Foto non leggibile: prova in JPG.'));
    img.src = url;
  });
}

export function CaricaDocumento({ rate }: { rate: { i: number; testo: string }[] }) {
  const router = useRouter();
  const file = useRef<HTMLInputElement>(null);
  const [tipo, setTipo] = useState<keyof typeof TIPI>('visita_medica');
  const [rata, setRata] = useState('');
  const [descrizione, setDescrizione] = useState('');
  const [msg, setMsg] = useState('');
  const [occupato, setOccupato] = useState(false);
  async function carica() {
    const f = file.current?.files?.[0];
    if (!f) { setMsg('Scegli il file da caricare.'); return; }
    if (tipo === 'bonifico' && rata === '') { setMsg('Scegli la rata pagata.'); return; }
    setOccupato(true); setMsg('Caricamento…');
    try {
      const { mime, base64 } = await inBase64(f);
      const nome = f.name.replace(/\.(heic|heif|png|jpe?g)$/i, '') + (mime === 'application/pdf' ? '' : '.jpg');
      const r = await caricaDocumento({ tipo, rata: rata === '' ? null : +rata, descrizione, nome, mime, base64 });
      if (!r.ok) throw new Error(r.errore);
      setMsg('Documento caricato: la segreteria lo controllerà.'); setDescrizione(''); setRata(''); if (file.current) file.current.value = '';
      router.refresh();
    } catch (e) { setMsg((e as Error).message || 'Documento non caricato: riprova.'); }
    setOccupato(false);
  }
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">Documento
          <select id="fd-tipo" className="campo mt-1" value={tipo} onChange={(e) => setTipo(e.target.value as keyof typeof TIPI)}>
            {Object.entries(TIPI).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        {tipo === 'bonifico' && (
          <label className="text-sm font-medium">Rata pagata
            <select id="fd-rata" className="campo mt-1" value={rata} onChange={(e) => setRata(e.target.value)}>
              <option value="">Scegli la rata</option>
              {rate.map((q) => <option key={q.i} value={q.i}>{q.testo}</option>)}
            </select></label>
        )}
        <label className="text-sm font-medium">Descrizione (facoltativa)
          <input id="fd-desc" className="campo mt-1" value={descrizione} placeholder="Es. certificato agonistico" onChange={(e) => setDescrizione(e.target.value)} /></label>
      </div>
      <input ref={file} id="fd-file" type="file" accept="image/jpeg,image/png,application/pdf"
        className="block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-blu file:px-3 file:py-2 file:font-semibold file:text-white" />
      <div className="flex items-center gap-3">
        <button type="button" className="bottone" disabled={occupato} onClick={carica}>{occupato ? 'Caricamento…' : 'Carica documento'}</button>
        <span role="status" className="text-sm text-grigio">{msg}</span>
      </div>
    </div>
  );
}
