import { redirect } from 'next/navigation';

/** Vecchio indirizzo: l'accesso ora è sulla pagina d'ingresso */
export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  redirect(next ? `/?next=${encodeURIComponent(next)}` : '/');
}
