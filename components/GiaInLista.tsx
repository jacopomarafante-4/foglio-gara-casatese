'use client';
// Segnala un giocatore: mentre si scrivono annata e cognome, i giocatori già in lista con quel cognome
// (anche scritto un po' diverso: accenti, apostrofi, spazi). "Valuta questo" apre subito la valutazione
// con quello che si è già scritto (0032); se è un altro ragazzo si continua con la segnalazione.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { normalizza } from '@/lib/utili';

type Trovato = { id: string; cognome: string | null; nome: string | null; annata: number; societa: { nome: string } | null };

export function GiaInLista({ formId }: { formId: string }) {
  const [chiave, setChiave] = useState({ annata: '', cognome: '', nome: '' });
  const [trovati, setTrovati] = useState<Trovato[]>([]);
  const [chiuso, setChiuso] = useState('');
  const router = useRouter();

  // legge annata, cognome e nome dal modulo della pagina (form server, niente stato React lì)
  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    const leggi = () => {
      const v = (n: string) => String((form.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
      setChiave({ annata: v('annata'), cognome: v('cognome'), nome: v('nome') });
    };
    form.addEventListener('input', leggi);
    form.addEventListener('change', leggi);
    return () => { form.removeEventListener('input', leggi); form.removeEventListener('change', leggi); };
  }, [formId]);

  useEffect(() => {
    const c = normalizza(chiave.cognome);
    if (!chiave.annata || c.length < 3) return;
    let annullato = false;
    const t = setTimeout(async () => {
      const { data } = await createClient().from('giocatori')
        .select('id, cognome, nome, annata, societa(nome)')
        .eq('annata', Number(chiave.annata)).eq('osservato', true)
        .ilike('cognome', `${chiave.cognome.slice(0, 1)}%`).limit(300);
      if (annullato) return;
      const n = normalizza(chiave.nome);
      const simili = ((data as unknown as Trovato[]) ?? [])
        .filter((g) => normalizza(g.cognome ?? '').startsWith(c) || c.startsWith(normalizza(g.cognome ?? '')))
        // prima quelli con lo stesso nome
        .sort((a, b) => Number(!!n && normalizza(b.nome ?? '').startsWith(n)) - Number(!!n && normalizza(a.nome ?? '').startsWith(n)));
      setTrovati(simili.slice(0, 5));
    }, 300);
    return () => { annullato = true; clearTimeout(t); };
  }, [chiave]);

  const attivi = chiave.annata && normalizza(chiave.cognome).length >= 3 ? trovati : [];
  const firma = attivi.map((g) => g.id).join();
  if (!attivi.length || chiuso === firma) return null;

  const valuta = (id: string) => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    const v = (n: string) => String((form?.elements.namedItem(n) as HTMLInputElement | null)?.value ?? '').trim();
    const q = new URLSearchParams({ gia: '1', nota: v('testo'), ...(v('contesto') ? { contesto: v('contesto') } : {}), ...(v('data') ? { data: v('data') } : {}) });
    router.push(`/giocatori/${id}/valuta?${q}`);
  };

  return (
    <div role="status" className="rounded-xl border-2 border-oro bg-oro/10 p-4">
      <p className="font-semibold">Già in lista: è uno di questi?</p>
      <p className="text-sm text-grigio">Se è lui, niente nuova segnalazione: valutalo (quello che hai scritto va nel commento).</p>
      <ul className="mt-2 divide-y divide-linea">
        {attivi.map((g) => (
          <li key={g.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span>
              <strong>{[g.cognome, g.nome].filter(Boolean).join(' ')}</strong>
              <span className="text-sm text-grigio"> · {g.annata}{g.societa?.nome ? ` · ${g.societa.nome}` : ''}</span>
            </span>
            <button type="button" onClick={() => valuta(g.id)} className="bottone px-4 py-2 text-sm">Valuta questo</button>
          </li>
        ))}
      </ul>
      <button type="button" onClick={() => setChiuso(firma)} className="mt-2 text-sm font-semibold text-blu">
        No, è un altro giocatore
      </button>
    </div>
  );
}
