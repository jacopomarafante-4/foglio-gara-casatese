'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavLink({
  href,
  children,
  mobile = false,
}: {
  href: string;
  children: React.ReactNode;
  mobile?: boolean;
}) {
  const attiva = usePathname().startsWith(href);

  if (mobile) {
    return (
      <Link
        href={href}
        aria-current={attiva ? 'page' : undefined}
        className={`py-3 text-center text-sm font-semibold ${attiva ? 'text-blu' : 'text-grigio'}`}
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={href}
      aria-current={attiva ? 'page' : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium ${attiva ? 'bg-white/15' : 'text-white/85 hover:bg-white/10'}`}
    >
      {children}
    </Link>
  );
}
