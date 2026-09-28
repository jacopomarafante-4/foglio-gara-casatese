// Carriera del giocatore (0035): società stagione per stagione. Righe della tabella `carriera`
// (cambi di società registrati in automatico, stagioni aggiunte a mano) e, accanto, le stagioni viste
// nelle distinte. La società la cambiano admin, direttori e scout.
import { Etichetta } from '@/components/Etichetta';
import type { Presenza } from '@/components/StoricoGiocatore';
import { fineStagione } from '@/lib/categorie';
import { dataBreve } from '@/lib/utili';
import { aggiungiStagione, cambiaSocieta, eliminaStagione } from '@/app/(app)/giocatori/actions';

export type RigaCarriera = {
  id: number; societa_nome: string; stagione: string; categoria: string | null; dal: string | null;
  origine: 'iniziale' | 'cambio' | 'manuale'; nota: string | null; autore_id: string | null; created_at: string;
  autore: { nome: string | null; cognome: string | null; email: string } | null;
};

type Voce =
  | { tipo: 'riga'; stagione: string; r: RigaCarriera }
  | { tipo: 'distinte'; stagione: string; societa: string; categorie: string[]; partite: number };

/** Ultime stagioni, dalla attuale indietro: "2026/27", "2025/26", … */
function stagioni(quante = 12) {
  const fine = fineStagione();
  return Array.from({ length: quante }, (_, i) => `${fine - 1 - i}/${String((fine - i) % 100).padStart(2, '0')}`);
}

/** Stagioni delle distinte: una voce per stagione e società di appartenenza */
function dalleDistinte(presenze: Presenza[]): Voce[] {
  const m = new Map<string, { stagione: string; societa: string; categorie: Set<string>; partite: number }>();
  for (const p of presenze) {
    if (!p.distinta) continue;
    const societa = p.appartenenza?.nome ?? p.squadra?.societa?.nome ?? '—';
    const k = `${p.distinta.stagione}|${societa}`;
    const v = m.get(k) ?? { stagione: p.distinta.stagione, societa, categorie: new Set<string>(), partite: 0 };
    v.partite++;
    if (p.distinta.categoria) v.categorie.add(p.distinta.categoria);
    m.set(k, v);
  }
  return [...m.values()].map((v) => ({ tipo: 'distinte', stagione: v.stagione, societa: v.societa, categorie: [...v.categorie], partite: v.partite }));
}

const ORIGINE = { iniziale: 'In archivio', cambio: 'Cambio di società', manuale: 'Aggiunta a mano' } as const;

export function CarrieraGiocatore({
  giocatoreId, attuale, righe, presenze, scrive, gestore, mioId, societa, chi,
}: {
  giocatoreId: string;
  attuale: string | null;
  righe: RigaCarriera[];
  presenze: Presenza[];
  scrive: boolean;          // admin, direttori, scout: cambiano la società e aggiungono stagioni
  gestore: boolean;         // admin e direttori: tolgono anche le righe degli altri
  mioId: string;
  societa: { id: string; nome: string }[];
  chi: (a: RigaCarriera['autore']) => string;
}) {
  const voci: Voce[] = [
    ...righe.map((r) => ({ tipo: 'riga' as const, stagione: r.stagione, r })),
    ...dalleDistinte(presenze),
  ].sort((a, b) => b.stagione.localeCompare(a.stagione)
    || (a.tipo === 'riga' && b.tipo === 'riga' ? b.r.created_at.localeCompare(a.r.created_at) : a.tipo === 'riga' ? -1 : 1));

  return (
    <section className="rounded-xl border border-linea bg-white p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <h2 className="font-display text-2xl font-bold">Carriera</h2>
        <span className="text-sm text-grigio">Adesso: <strong className="text-inchiostro">{attuale ?? 'società da completare'}</strong></span>
      </div>

      {voci.length === 0 ? (
        <p className="mt-3 text-grigio">Ancora nessuna stagione registrata.</p>
      ) : (
        <ol className="mt-3 divide-y divide-linea">
          {voci.map((v) => v.tipo === 'distinte' ? (
            <li key={`d${v.stagione}${v.societa}`} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
              <span className="w-16 shrink-0 font-display font-bold">{v.stagione}</span>
              <span className="font-semibold">{v.societa}</span>
              <span className="text-grigio">{[...v.categorie, `${v.partite} ${v.partite === 1 ? 'partita' : 'partite'} in distinta`].join(' · ')}</span>
            </li>
          ) : (
            <li key={`r${v.r.id}`} className="flex flex-wrap items-baseline gap-x-3 py-2 text-sm">
              <span className="w-16 shrink-0 font-display font-bold">{v.r.stagione}</span>
              <span className="font-semibold">{v.r.societa_nome}</span>
              <span className="text-grigio">
                {[v.r.categoria, ORIGINE[v.r.origine] + (v.r.dal && v.r.origine === 'cambio' ? ` dal ${dataBreve(v.r.dal)}` : ''),
                  v.r.autore ? chi(v.r.autore) : null].filter(Boolean).join(' · ')}
              </span>
              {v.r.nota && <span className="basis-full pl-[4.75rem] text-grigio">{v.r.nota}</span>}
              {scrive && (gestore || v.r.autore_id === mioId) && (
                <form action={eliminaStagione} className="ml-auto">
                  <input type="hidden" name="id" value={giocatoreId} />
                  <input type="hidden" name="riga" value={v.r.id} />
                  <button className="text-xs text-grigio hover:text-rosso" aria-label={`Togli la riga ${v.r.stagione} ${v.r.societa_nome}`}>Togli</button>
                </form>
              )}
            </li>
          ))}
        </ol>
      )}

      {scrive && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <details className="rounded-lg border border-linea p-3">
            <summary className="cursor-pointer text-sm font-semibold text-blu">Cambia società</summary>
            <form action={cambiaSocieta} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={giocatoreId} />
              <Etichetta testo="Nuova società">
                <input name="societa" list="carriera-societa" required className="campo" autoComplete="off" />
              </Etichetta>
              <Etichetta testo="Da quando" aiuto="Facoltativo: decide la stagione">
                <input type="date" name="dal" className="campo" />
              </Etichetta>
              <textarea name="nota" rows={2} placeholder="Nota (es. passato a gennaio, in prestito)" className="campo" />
              <button className="bottone w-full">Salva nuova società</button>
            </form>
          </details>
          <details className="rounded-lg border border-linea p-3">
            <summary className="cursor-pointer text-sm font-semibold text-blu">Aggiungi una stagione passata</summary>
            <form action={aggiungiStagione} className="mt-3 space-y-3">
              <input type="hidden" name="id" value={giocatoreId} />
              <div className="grid grid-cols-2 gap-3">
                <Etichetta testo="Stagione">
                  <select name="stagione" required className="campo" defaultValue="">
                    <option value="" disabled>Scegli</option>
                    {stagioni().map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </Etichetta>
                <Etichetta testo="Categoria">
                  <input name="categoria" placeholder="Es. Under 13" className="campo" />
                </Etichetta>
              </div>
              <Etichetta testo="Società">
                <input name="societa" list="carriera-societa" required className="campo" autoComplete="off" />
              </Etichetta>
              <textarea name="nota" rows={2} placeholder="Nota (facoltativa)" className="campo" />
              <button className="bottone w-full">Aggiungi stagione</button>
            </form>
          </details>
          <datalist id="carriera-societa">
            {societa.map((s) => <option key={s.id} value={s.nome} />)}
          </datalist>
        </div>
      )}
    </section>
  );
}
