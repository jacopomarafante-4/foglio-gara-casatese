/** Scelta di un voto da 1 a 5 con pulsanti grandi (comodi da telefono) */
export function Voto({
  nome,
  obbligatorio = false,
  predefinito,
}: {
  nome: string;
  obbligatorio?: boolean;
  predefinito?: number;
}) {
  return (
    <div className="flex gap-2" role="radiogroup">
      {[1, 2, 3, 4, 5].map((n) => (
        <label key={n} className="flex-1">
          <input
            type="radio"
            name={nome}
            value={n}
            required={obbligatorio}
            defaultChecked={predefinito === n}
            className="peer sr-only"
          />
          <span className="block cursor-pointer rounded-lg border border-linea bg-white py-3 text-center font-display text-xl font-bold peer-checked:border-blu peer-checked:bg-blu peer-checked:text-white peer-focus-visible:outline peer-focus-visible:outline-3 peer-focus-visible:outline-oro">
            {n}
          </span>
        </label>
      ))}
    </div>
  );
}
