import { notFound } from 'next/navigation';
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

  return <div className="min-h-screen w-full">{props.children}</div>;
}
