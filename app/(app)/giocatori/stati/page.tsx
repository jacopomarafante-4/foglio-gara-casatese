// La vista a colonne per stato è stata sostituita dalle schede dell'elenco Giocatori (Segnalati, Osservati, Esito…)
import { redirect } from 'next/navigation';
export default function Stati() { redirect('/giocatori'); }
