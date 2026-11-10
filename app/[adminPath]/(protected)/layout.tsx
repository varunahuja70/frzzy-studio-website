import { redirect } from 'next/navigation';
import { ADMIN_PATH } from '@/lib/auth/config';
import { validateAdminSession } from '@/lib/auth/session';
import { AdminLayoutShell } from '@/components/admin/admin-layout-shell';

export default async function ProtectedAdminLayout(props: {
  children: React.ReactNode;
  params: Promise<{ adminPath: string }>;
}) {
  const { adminPath } = await props.params;

  const sessionRes = await validateAdminSession();
  if (!sessionRes.valid) {
    redirect(`/${adminPath}/login`);
  }

  return (
    <AdminLayoutShell
      adminPath={adminPath}
      userEmail={sessionRes.admin?.email || ''}
      adminId={sessionRes.admin?.id || ''}
    >
      {props.children}
    </AdminLayoutShell>
  );
}
