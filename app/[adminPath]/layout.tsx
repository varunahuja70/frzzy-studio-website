import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ADMIN_PATH } from '@/lib/auth/config';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: 'FRXCX Studio Vault — Secured Admin Area',
  icons: {
    icon: [
      { url: '/icon-32x32.png', type: 'image/png', sizes: '32x32' },
      { url: '/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icon.png', type: 'image/png', sizes: '512x512' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    shortcut: '/icon-32x32.png',
    apple: '/apple-touch-icon.png',
  },
};

export default async function AdminRootLayout(props: {
  children: React.ReactNode;
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await props.params;

  // Strict non-obvious route verification (e.g. 'studio-vault')
  if (adminPath !== ADMIN_PATH) {
    notFound();
  }

  const nonce = (await headers()).get('x-nonce') ?? undefined;

  return (
    <div className="min-h-screen w-full bg-[#12110b] text-[#f4efea] dark">
      <link rel="icon" type="image/png" sizes="32x32" href="/icon-32x32.png" />
      <link rel="icon" type="image/png" sizes="192x192" href="/icon-192.png" />
      <link rel="icon" type="image/png" sizes="512x512" href="/icon.png" />
      <link rel="shortcut icon" href="/icon-32x32.png" />
      <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      <script
        nonce={nonce}
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: "document.documentElement.classList.add('dark');",
        }}
      />
      {props.children}
    </div>
  );
}
