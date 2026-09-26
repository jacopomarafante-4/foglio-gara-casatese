'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/** Carica foto o PDF delle distinte nel contenitore privato "distinte", nella cartella della gara */
export async function caricaDistinte(garaId: string, file: File[], avanzamento?: (i: number) => void) {
  const supabase = createClient();
  let caricate = 0;
  const falliti: string[] = [];
  for (const [i, f] of file.entries()) {
    avanzamento?.(i);
    const nome = f.name.normalize('NFD').replace(/[^\w.-]+/g, '_').slice(-80);
    const percorso = `${garaId}/${Date.now()}-${i}-${nome}`;
    const up = await supabase.storage.from('distinte').upload(percorso, f, { contentType: f.type || undefined });
    const ins = up.error ? up : await supabase.from('gare_allegati').insert({ gara_id: garaId, percorso, nome_file: f.name, tipo: f.type });
    if (ins.error) falliti.push(f.name); else caricate++;
  }
  return { caricate, falliti };
}

/** Pulsante "+ Foto o PDF della distinta" per una gara già salvata */
export function CaricaDistinte({ garaId }: { garaId: string }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [stato, setStato] = useState('');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input ref={input} type="file" accept="image/*,application/pdf" multiple className="hidden"
        onChange={async (e) => {
          const file = Array.from(e.target.files ?? []);
          e.target.value = '';
          if (!file.length) return;
          const r = await caricaDistinte(garaId, file, (i) => setStato(`Carico ${i + 1} di ${file.length}…`));
          setStato(r.falliti.length ? `Non caricate: ${r.falliti.join(', ')}` : `${r.caricate === 1 ? 'Distinta caricata' : `${r.caricate} distinte caricate`}.`);
          router.refresh();
        }} />
      <button type="button" onClick={() => input.current?.click()} className="rounded-lg border border-blu px-4 py-2.5 font-semibold text-blu hover:bg-blu/5">
        + Foto o PDF della distinta
      </button>
      {stato && <span className="text-sm text-grigio">{stato}</span>}
    </div>
  );
}
