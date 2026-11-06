import type { Metadata } from 'next';
import { Inter_Tight, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';
import { AnalyticsTracker } from '@/components/analytics-tracker';

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
  title: 'Weichie — Think. Shoot. Design.',
  description:
    'Pixel-perfect interactive editorial hero experience with Weichie navigation, staggered bottom-up reveal animations, and hover-triggered inline video cards.',
  openGraph: {
    title: 'Weichie — Think. Shoot. Design.',
    description:
      'Pixel-perfect interactive editorial hero experience with Weichie navigation, staggered bottom-up reveal animations, and hover-triggered inline video cards.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Weichie — Think. Shoot. Design.',
    description:
      'Pixel-perfect interactive editorial hero experience with Weichie navigation, staggered bottom-up reveal animations, and hover-triggered inline video cards.',
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
      className={`${interTight.variable} ${plusJakarta.variable} [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 [&_*]:[scrollbar-width:none] [&_*::-webkit-scrollbar]:hidden overflow-x-hidden`}
    >
      <body
        suppressHydrationWarning
        className="bg-[#ecf5f4] text-[#12110b] dark:bg-[#12110b] dark:text-[#f4efea] antialiased selection:bg-[#ff4f31] selection:text-white transition-colors duration-500 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:w-0 [&::-webkit-scrollbar]:h-0 overflow-x-hidden"
      >
        <AnalyticsTracker />
        {children}
      </body>
    </html>
  );
}
