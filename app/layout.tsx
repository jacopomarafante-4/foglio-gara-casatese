import type { Metadata, Viewport } from 'next';
// Caratteri inclusi nel progetto (funzionano anche offline)
import '@fontsource/barlow/400.css';
import '@fontsource/barlow/500.css';
import '@fontsource/barlow/600.css';
import '@fontsource/barlow-condensed/600.css';
import '@fontsource/barlow-condensed/700.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scouting Hub',
  description: 'Segnalazioni e valutazioni del team scouting',
};

export const viewport: Viewport = {
  themeColor: '#003da5',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="h-full antialiased">
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
