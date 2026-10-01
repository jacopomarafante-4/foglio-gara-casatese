'use server';
// Calendario → Tutte le squadre → "Calendario ufficiale (PDF)" (admin e direttori): il PDF della LND o della delegazione si legge
// sul server (lib/leggi-pdf.ts + lib/calendario-pdf.ts). Prima l'anteprima (niente scritto), poi l'importazione: gare dello Scouting e
// calendario delle nostre squadre di quella categoria (lib/importa-calendario-ufficiale.ts). Il PDF arriva come file (FormData) a
// tutte e due le azioni: si rilegge, così non passa avanti e indietro un elenco enorme.
import { revalidatePath } from 'next/cache';
import { chiEntra } from '@/lib/portale-dati';
import { vedeTutto } from '@/lib/ruoli';
import { createClient } from '@/lib/supabase/server';
import { oggiIso } from '@/lib/utili';
import { pagineDelPdf } from '@/lib/leggi-pdf';
import { indovinaCategoria, leggi, prepara } from '@/lib/calendario-pdf';
import { categoriaDellaSquadra, scriviGare, unisciCalendario, type GaraNostra, type PartitaCal } from '@/lib/importa-calendario-ufficiale';
import { aggiorna } from '@/lib/aggiorna-doc';

export type PartitaAnteprima = { data: string; ora: string; casa: boolean; avversario: string; campo: string; girone: string; giornata: number };
export type Anteprima = {
  file: string; categoria: string; stagione: string; gironi: { g: string; partite: number; squadre: number }[]; partite: number; dubbi: string[];
  gare: number; gia: number; bloccate: number; collegate: number; nuove: string[]; nostre: PartitaAnteprima[]; squadre: { id: string; nome: string }[];
};
type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

const inizioStagione = () => { const [a, m] = oggiIso().split('-').map(Number); return m >= 7 ? a : a - 1; };

async function apri(fd: FormData) {
  const chi = await chiEntra();
  if (!chi.profilo || !vedeTutto(chi.profilo.ruolo)) throw new Error('Solo admin e direttori importano i calendari ufficiali.');
  const file = fd.get('file');
  if (!(file instanceof Blob) || !file.size) throw new Error('Scegli il PDF del calendario.');
  if (file.size > 4 * 1024 * 1024) throw new Error('Il PDF è troppo grande (massimo 4 MB).');
  const nome = String(fd.get('nome') || (file as File).name || 'calendario.pdf').slice(0, 120);
  const pagine = await pagineDelPdf(new Uint8Array(await file.arrayBuffer()));
  const lettura = leggi(pagine, inizioStagione());
  if (!Object.values(lettura.gironi).some((g) => g.partite.length)) throw new Error('Nel PDF non ho trovato giornate e partite: è un calendario ufficiale?');
  const categoria = String(fd.get('categoria') || '').trim() || indovinaCategoria(pagine.slice(0, 4).flatMap((p) => p.righe).join(' '), nome);
  const { partite, dubbi } = prepara(lettura, categoria, inizioStagione(), nome);
  return { chi, nome, lettura, categoria, partite, dubbi, db: await createClient() };
}

async function squadreDi(db: Awaited<ReturnType<typeof createClient>>, categoria: string) {
  const { data } = await db.from('docs').select('data').eq('path', 'shared/teams').maybeSingle();
  const items = ((data?.data as { items?: { id: string; name?: string; category?: string; organizza?: boolean; vedeTutte?: boolean }[] })?.items ?? []);
  return items.filter((t) => !t.organizza && !t.vedeTutte && categoriaDellaSquadra(String(t.category ?? ''), categoria));
}

const quando = (iso: string, daDefinire: boolean) => {
  const d = new Date(iso);
  return { data: d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Rome' }),
    ora: daDefinire ? '' : d.toLocaleTimeString('it-IT', { timeZone: 'Europe/Rome', hour: '2-digit', minute: '2-digit' }) };
};

export async function anteprimaUfficiale(fd: FormData): Promise<Esito<Anteprima>> {
  try {
    const { nome, lettura, categoria, partite, dubbi, db } = await apri(fd);
    const { riepilogo, nostraChiave, nostre } = await scriviGare(db, partite, false);
    const squadre = await squadreDi(db, categoria);
    return { ok: true, valore: {
      file: nome, categoria, stagione: partite[0]?.stagione ?? '', partite: partite.length, dubbi: dubbi.slice(0, 30),
      gironi: Object.entries(lettura.gironi).filter(([, v]) => v.partite.length).sort(([a], [b]) => a.localeCompare(b))
        .map(([g, v]) => ({ g, partite: partite.filter((p) => p.girone === g).length, squadre: new Set(v.partite.flatMap((p) => [p.casa, p.trasferta])).size })),
      gare: riepilogo.gare, gia: riepilogo.gia, bloccate: riepilogo.bloccate, collegate: riepilogo.collegate, nuove: riepilogo.nuove,
      nostre: nostre.map((r) => {
        const casa = r._casa === nostraChiave;
        return { ...quando(r.data_ora, r.ora_da_definire), casa, avversario: casa ? r.trasferta_nome : r.casa_nome, campo: r.campo ?? '', girone: r.girone, giornata: r.giornata };
      }).sort((a, b) => a.data.localeCompare(b.data)),
      squadre: squadre.map((t) => ({ id: t.id, nome: [t.name, t.category].filter(Boolean).join(' · ') })),
    } };
  } catch (e) { return { ok: false, errore: (e as Error).message }; }
}

export type Importato = { scritte: number; bloccate: number; nuove: number; collegate: number; squadre: { nome: string; aggiunte: number; aggiornate: number; errore?: string }[] };

export async function importaUfficiale(fd: FormData): Promise<Esito<Importato>> {
  try {
    const { chi, categoria, partite, db } = await apri(fd);
    if (/\?/.test(categoria)) throw new Error('Scrivi la categoria completa (es. "Under 15 Provinciali Lecco").');
    const { riepilogo, nostra, nostre, scritte } = await scriviGare(db, partite, true);
    const squadre: Importato['squadre'] = [];
    if (nostra && nostre.length) {
      const gare: GaraNostra[] = [];
      for (let i = 0; i < nostre.length; i += 40) {
        const { data, error } = await db.from('gare').select('id, data_ora, categoria, casa_id, trasferta_id, casa_nome, trasferta_nome, campo, indirizzo, lat, lon, ora_da_definire, stato, comunicato')
          .in('chiave', nostre.slice(i, i + 40).map((r) => r.chiave));
        if (error) throw new Error('Gare: ' + error.message);
        gare.push(...((data ?? []) as GaraNostra[]));
      }
      gare.sort((a, b) => a.data_ora.localeCompare(b.data_ora));
      const nuovoId = () => 'm' + Math.random().toString(36).slice(2, 9);
      for (const t of await squadreDi(db, categoria)) {
        let conti = { aggiunte: 0, aggiornate: 0 };
        const r = await aggiorna(chi, `calendar/${t.id}`, (base) => {
          const u = unisciCalendario(((base?.matches ?? []) as PartitaCal[]), gare, nostra, nuovoId);
          conti = { aggiunte: u.aggiunte, aggiornate: u.aggiornate };
          return { nuovo: u.aggiunte || u.aggiornate ? { ...(base ?? {}), matches: u.matches } : null };
        });
        squadre.push({ nome: [t.name, t.category].filter(Boolean).join(' · '), ...conti, ...(r.ok ? {} : { errore: r.errore }) });
      }
    }
    revalidatePath('/calendari/tutte'); revalidatePath('/calendari/squadra'); revalidatePath('/inizio');
    return { ok: true, valore: { scritte, bloccate: riepilogo.bloccate, nuove: riepilogo.nuove.length, collegate: riepilogo.collegate, squadre } };
  } catch (e) { return { ok: false, errore: (e as Error).message }; }
}
