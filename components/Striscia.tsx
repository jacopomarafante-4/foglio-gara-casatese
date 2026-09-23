/** La striscia blu-oro-rosso del club, usata sotto l'intestazione */
export function Striscia() {
  return (
    <div aria-hidden className="flex h-1.5">
      <div className="flex-[6] bg-blu" />
      <div className="flex-1 bg-oro" />
      <div className="flex-[2] bg-rosso" />
    </div>
  );
}
