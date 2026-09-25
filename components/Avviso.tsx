/** Messaggio di conferma o di errore, letto dall'indirizzo (?ok=… / ?errore=…) */
export function Avviso({ ok, errore }: { ok?: string; errore?: string }) {
  if (errore) {
    return (
      <p role="alert" className="rounded-md bg-rosso/10 px-4 py-3 text-sm text-rosso">
        {errore}
      </p>
    );
  }
  if (ok) {
    return (
      <p role="status" className="rounded-md bg-blu/10 px-4 py-3 text-sm text-blu">
        {ok}
      </p>
    );
  }
  return null;
}
