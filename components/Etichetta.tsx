/** Etichetta + campo di un form, con testo di aiuto opzionale */
export function Etichetta({
  testo,
  aiuto,
  children,
}: {
  testo: string;
  aiuto?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium">{testo}</span>
      {children}
      {aiuto && <span className="mt-1 block text-xs text-grigio">{aiuto}</span>}
    </label>
  );
}
