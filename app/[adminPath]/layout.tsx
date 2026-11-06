import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { ADMIN_PATH } from '@/lib/auth/config';
import { validateAdminSession } from '@/lib/auth/session';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

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

  // Check current URL path to distinguish login from protected routes
  const headerList = await headers();
  const currentUrl = headerList.get('x-url') || '';
  const isLoginPage = currentUrl.includes(`/${adminPath}/login`);

  const sessionRes = await validateAdminSession();

  // If user is accessing protected routes without valid 2FA session, redirect to login
  if (!isLoginPage && !sessionRes.valid) {
    // Note: If on login page, let it render directly
    redirect(`/${adminPath}/login`);
  }

  // If already authenticated and visiting login page, redirect to dashboard
  if (isLoginPage && sessionRes.valid) {
    redirect(`/${adminPath}`);
  }

  if (isLoginPage) {
    return <div className="min-h-screen w-full">{props.children}</div>;
  }

  return (
    <AdminLayoutShell
      adminPath={adminPath}
      userEmail={sessionRes.admin?.email || 'admin@frxcxstudio.com'}
    >
      {props.children}
    </AdminLayoutShell>
  );
}
