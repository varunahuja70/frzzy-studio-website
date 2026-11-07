import type { Metadata } from 'next';
import { Geist, Geist_Mono, Inter_Tight, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AnalyticsTracker } from '@/components/analytics-tracker';
import { paletteBootScript, paletteCss } from '@/lib/palette';

const geistSans = Geist({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
});

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
});

const interTight = Inter_Tight({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-hero',
  display: 'swap',
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-nav',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'FRZZY Studio — Motion, 3D & Visuals with Static Energy',
  description:
    'FRZZY Studio makes motion design, 3D and branding with static energy. Stay FRZZY.',
  openGraph: {
    title: 'FRZZY Studio — Motion, 3D & Visuals with Static Energy',
    description:
      'FRZZY Studio makes motion design, 3D and branding with static energy. Stay FRZZY.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FRZZY Studio — Motion, 3D & Visuals with Static Energy',
    description:
      'FRZZY Studio makes motion design, 3D and branding with static energy. Stay FRZZY.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${interTight.variable} ${plusJakarta.variable} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden overflow-x-clip`}
    >
      <head>
        {/* Sets <html data-palette> before first paint so the page never flashes the wrong colours. */}
        <script dangerouslySetInnerHTML={{ __html: paletteBootScript }} />
        {/* Colour tokens for every palette, generated from lib/palette.ts. */}
        <style id="palette-tokens" dangerouslySetInnerHTML={{ __html: paletteCss() }} />
      </head>
      <body
        suppressHydrationWarning
        className="bg-[var(--black)] text-[var(--ivory)] antialiased selection:bg-[var(--volt)] selection:text-[var(--on-volt)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 overflow-x-clip"
      >
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
