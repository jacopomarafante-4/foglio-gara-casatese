/** Scelta di un voto da 1 a 5 con pulsanti grandi (comodi da telefono).
 *  facoltativo: versione compatta con "–" per non rispondere (domande non obbligatorie) */
export function Voto({
  nome,
  obbligatorio = false,
  predefinito,
  facoltativo = false,
}: {
  nome: string;
  obbligatorio?: boolean;
  predefinito?: number;
  facoltativo?: boolean;
}) {
  const voci: (number | '')[] = facoltativo ? ['', 1, 2, 3, 4, 5] : [1, 2, 3, 4, 5];
  return (
    <div className={`flex ${facoltativo ? 'gap-1.5' : 'gap-2'}`} role="radiogroup">
      {voci.map((n) => (
        <label key={n === '' ? 'nessuno' : n} className="flex-1">
          <input
            type="radio"
            name={nome}
            value={n}
            required={obbligatorio}
            defaultChecked={n === '' ? facoltativo && !predefinito : predefinito === n}
            className="peer sr-only"
            aria-label={n === '' ? 'Nessun voto' : String(n)}
          />
          <span className={`block cursor-pointer rounded-lg border border-linea bg-white text-center font-display font-bold peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro ${
            facoltativo ? 'py-2 text-base' : 'py-3 text-xl'} ${n === '' ? 'text-grigio' : ''}`}>
            {n === '' ? '–' : n}
          </span>
        </label>
      ))}
    </div>
  );
}
