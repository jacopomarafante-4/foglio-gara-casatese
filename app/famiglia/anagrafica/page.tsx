// Famiglia → Anagrafica: dati del ragazzo (in lettura) e contatti dei genitori e taglie (modificabili)
import { getFamiglia } from '@/lib/famiglia';
import { fmtData } from '@/lib/programma';
import { Contatti } from '@/components/famiglia/Contatti';

export default async function AnagraficaFamiglia() {
  const { f } = (await getFamiglia())!;
  const r = f.ragazzo ?? {};
  const voce = (l: string, v?: string | number) => (
    <div className="rounded-xl bg-carta px-3 py-2"><span className="block text-xs font-semibold uppercase tracking-wider text-grigio">{l}</span><b>{v || '—'}</b></div>
  );
  const dati = Object.fromEntries(Object.entries(f.dati ?? {}).filter(([, v]) => typeof v === 'string').map(([k, v]) => [k, v as string]));
  return (
    <div className="space-y-4">
      <h1 className="font-display text-4xl font-bold">{r.nome}</h1>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {voce('Squadra', f.squadra?.category)}{voce('Data di nascita', r.data_nascita ? fmtData(r.data_nascita) : '')}
        {voce('Ruolo', r.ruolo ? r.ruolo[0].toUpperCase() + r.ruolo.slice(1) : '')}{voce('Numero', r.numero)}
      </div>
      <section className="rounded-2xl border border-linea bg-white p-4">
        <h2 className="font-display text-2xl font-bold">Contatti dei genitori e taglie</h2>
        <p className="mb-3 text-sm text-grigio">Teneteli aggiornati: servono al mister e alla segreteria.</p>
        <Contatti iniziali={dati} />
      </section>
    </div>
  );
}
