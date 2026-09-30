// Portale: le squadre di cui lo staff entrato (direttore) è anche mister (stesso PIN, 0050). Solo gli id, mai il PIN.
import { chiEntra } from '@/lib/portale-dati';

export async function GET() {
  const chi = await chiEntra();
  return Response.json({ squadre: (chi.misterDi?.squadre ?? []).map((t) => t.id) });
}
