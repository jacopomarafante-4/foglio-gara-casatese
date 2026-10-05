'use client';
// Bozza di un modulo (segnalazione, valutazione) sul telefono: si salva mentre si scrive, si ritrova riaprendo la pagina e
// non si perde premendo Salva senza rete (il modulo non parte e avvisa). Si cancella quando il salvataggio è riuscito: alla
// pagina successiva, se non è tornata indietro con un errore. Si salvano solo i campi cambiati rispetto alla pagina appena aperta.
import { useEffect, useState } from 'react';

const PRE = 'acm_bozza:';
const INVIATA = 'acm_bozza_inviata';
type Valori = Record<string, string>;

const leggi = (k: string): Valori | null => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch { return null; } };
const togli = (k: string) => { try { localStorage.removeItem(k); } catch { /* niente */ } };
const metti = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* spazio pieno: pazienza */ } };

/** Dopo un invio: nella pagina successiva la bozza si toglie, tranne se si è tornati con un errore o si è ricaricata la stessa
 *  pagina (invio fallito per la rete) */
export function pulisciBozzaInviata() {
  const inviata = leggi(INVIATA) as unknown as { k: string; url: string } | null;
  if (!inviata) return;
  if (new URLSearchParams(location.search).has('errore')) { togli(INVIATA); return; }
  if (location.pathname + location.search === inviata.url) return;
  togli(inviata.k); togli(INVIATA);
}

function valori(form: HTMLFormElement): Valori {
  const out: Valori = {};
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || el.disabled || ['submit', 'button', 'file', 'reset'].includes(el.type)) continue;
    if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) out[el.name] = el.value; else if (!(el.name in out)) out[el.name] = ''; }
    else out[el.name] = el.value;
  }
  return out;
}

function ripristina(form: HTMLFormElement, v: Valori) {
  for (const el of Array.from(form.elements) as HTMLInputElement[]) {
    if (!el.name || !(el.name in v)) continue;
    const x = v[el.name];
    if (el.type === 'radio' || el.type === 'checkbox') el.checked = el.value === x;
    else if (el.type === 'hidden') { el.value = x; el.dispatchEvent(new CustomEvent('ripristina', { detail: x })); }   // SceltaRapida
    else el.value = x;
    if (x) el.closest('details')?.setAttribute('open', '');
  }
}

export function BozzaModulo({ formId, chiave }: { formId: string; chiave: string }) {
  const [ritrovata, setRitrovata] = useState(false);
  const [avviso, setAvviso] = useState('');

  useEffect(() => {
    const form = document.getElementById(formId) as HTMLFormElement | null;
    if (!form) return;
    pulisciBozzaInviata();
    const k = PRE + chiave;
    const iniziale = valori(form);
    const salvata = leggi(k);
    if (salvata && Object.keys(salvata).length) { ripristina(form, salvata); queueMicrotask(() => setRitrovata(true)); }
    const salvaOra = () => {
      const ora = valori(form);
      const cambiati = Object.fromEntries(Object.entries(ora).filter(([n, x]) => x !== (iniziale[n] ?? '')));
      if (Object.keys(cambiati).length) metti(k, cambiati); else togli(k);
    };
    let t: ReturnType<typeof setTimeout> | undefined;
    const salva = () => { clearTimeout(t); t = setTimeout(salvaOra, 300); };   // dopo il tocco: lo stato dei pulsanti è già aggiornato
    const invio = (e: Event) => {
      clearTimeout(t); salvaOra();
      if (!navigator.onLine) {
        // il modulo non parte: senza rete si perderebbe. Prima di React (fase di cattura), così l'azione non si avvia
        e.preventDefault(); e.stopPropagation();
        setAvviso('Senza rete: la bozza è salvata sul telefono. Premi di nuovo Salva quando torna la rete.');
        return;
      }
      metti(INVIATA, { k, url: location.pathname + location.search });
    };
    form.addEventListener('input', salva);
    form.addEventListener('change', salva);
    form.addEventListener('click', salva);
    form.addEventListener('submit', invio, true);
    const rete = () => setAvviso('');
    window.addEventListener('online', rete);
    return () => {
      window.removeEventListener('online', rete);
      clearTimeout(t);
      form.removeEventListener('input', salva); form.removeEventListener('change', salva);
      form.removeEventListener('click', salva); form.removeEventListener('submit', invio, true);
    };
  }, [formId, chiave]);

  return (
    <>
      {ritrovata && (
        <p className="flex flex-wrap items-center justify-between gap-2 rounded-xl border-l-4 border-oro bg-carta p-3 text-sm">
          <span><b>Bozza ritrovata:</b> quello che avevi scritto e non avevi ancora salvato.</span>
          <button type="button" className="font-semibold text-blu underline" onClick={() => { togli(PRE + chiave); location.reload(); }}>
            Ricomincia da capo
          </button>
        </p>
      )}
      {avviso && (
        <p role="alert" className="fixed bottom-20 left-1/2 z-30 w-[min(92vw,30rem)] -translate-x-1/2 rounded-xl bg-inchiostro px-4 py-3 text-sm font-semibold text-white shadow-lg">
          {avviso}
        </p>
      )}
    </>
  );
}
