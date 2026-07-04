import type { Metadata } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { Analytics } from '@vercel/analytics/react';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('https://helm-internal-agent-platform.vercel.app'),
  title: 'Helm — Vercel for internal agents',
  description: 'Deploy an internal agent in one command. Govern it in zero extra ones.',
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: 'Helm — Vercel for internal agents',
    description: 'Deploy an internal agent in one command. Govern it in zero extra ones.',
    url: 'https://helm-internal-agent-platform.vercel.app',
    siteName: 'Helm',
    images: ['/og.png'],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Helm — Vercel for internal agents',
    description: 'Deploy an internal agent in one command. Govern it in zero extra ones.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="bg-bg-dark text-text-primary font-sans">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
