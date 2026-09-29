/** Scelta con pulsanti grandi (comodi da telefono): di base un voto da 1 a 5.
 *  facoltativo: con "–" per non rispondere; voci: altre scelte (es. piede: Destro, Sinistro, Entrambi) nello stesso stile */
export function Voto({
  nome,
  obbligatorio = false,
  predefinito,
  facoltativo = false,
  voci,
}: {
  nome: string;
  obbligatorio?: boolean;
  predefinito?: number | string;
  facoltativo?: boolean;
  voci?: [string, string][];
}) {
  const scelte: [string, string][] = [
    ...(facoltativo ? [['', '–'] as [string, string]] : []),
    ...(voci ?? [1, 2, 3, 4, 5].map((n) => [String(n), String(n)] as [string, string])),
  ];
  return (
    <div className={`flex ${facoltativo ? 'gap-1.5' : 'gap-2'}`} role="radiogroup">
      {scelte.map(([valore, etichetta]) => (
        <label key={valore || 'nessuno'} className="min-w-0 flex-1">
          <input
            type="radio"
            name={nome}
            value={valore}
            required={obbligatorio}
            defaultChecked={valore === '' ? facoltativo && !predefinito : String(predefinito) === valore}
            className="peer sr-only"
            aria-label={valore === '' ? 'Nessuna risposta' : etichetta}
          />
          <span className={`block cursor-pointer truncate rounded-lg border border-linea bg-white px-1 text-center font-display font-bold peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro ${
            facoltativo ? 'py-2 text-base' : 'py-3 text-xl'} ${valore === '' ? 'text-grigio' : ''}`}>
            {etichetta}
          </span>
        </label>
      ))}
    </div>
  );
}
