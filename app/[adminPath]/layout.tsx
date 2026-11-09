import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { ADMIN_PATH } from '@/lib/auth/config';

export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: 'FRXCX Studio Vault — Secured Admin Area',
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
