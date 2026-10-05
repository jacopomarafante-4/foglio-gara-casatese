// Comunicazione, unita ad Avvisi: questo indirizzo resta per i link già in giro.
import { redirect } from 'next/navigation';

export default function ComunicazioneRedirect() {
  redirect('/calendari/avvisi');
}
