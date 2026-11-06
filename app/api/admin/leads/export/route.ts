import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { validateAdminSession } from '@/lib/auth/session';
import { db, ensureDatabaseReady } from '@/lib/db';
import { leads } from '@/lib/db/schema';
import { desc } from 'drizzle-orm';
import { decryptPii } from '@/lib/auth/encryption';
import { logAuditEvent } from '@/lib/auth/audit';

function verifyReauthGrant(grantCookie?: string, adminId?: string): boolean {
  if (!grantCookie || !adminId) return false;
  const parts = grantCookie.split(':');
  if (parts.length !== 4) return false;

  const [grantAdminId, expStr, nonce, signature] = parts;
  if (grantAdminId !== adminId) return false;

  const exp = parseInt(expStr, 10);
  if (Date.now() > exp) return false;

  const secret = process.env.ADMIN_PASSWORD_PEPPER || 'reauth-pepper';
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(`${grantAdminId}:${expStr}:${nonce}`)
    .digest('hex');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
}

/**
 * Escapes CSV values and protects against CSV Formula Injection Attacks
 * (=, +, -, @, \t, \r)
 */
function sanitizeCsvCell(val: string | null | undefined): string {
  if (!val) return '""';
  let str = String(val).trim();

  // CSV Formula Injection mitigation: if cell starts with formula trigger, prefix with single quote
  if (/^[=+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // Escape inner double quotes
  str = str.replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const grant = req.cookies.get('admin_reauth_grant')?.value;
    if (!verifyReauthGrant(grant, sessionRes.admin.id)) {
      return NextResponse.json(
        { error: 'Sensitive action: re-authentication required', requiresReauth: true },
        { status: 403 }
      );
    }

    await ensureDatabaseReady();

    const allLeads = await db
      .select()
      .from(leads)
      .orderBy(desc(leads.createdAt))
      .limit(5000);

    const headers = [
      'Lead ID',
      'Created At',
      'First Name',
      'Last Name',
      'Email',
      'Category',
      'Status',
      'Message',
      'Country',
      'Device',
      'Browser',
      'OS',
      'Source Page',
    ];

    const rows = allLeads.map((lead) => [
      sanitizeCsvCell(lead.id),
      sanitizeCsvCell(new Date(lead.createdAt).toISOString()),
      sanitizeCsvCell(lead.firstName),
      sanitizeCsvCell(lead.lastName),
      sanitizeCsvCell(decryptPii(lead.emailEncrypted)),
      sanitizeCsvCell(lead.category),
      sanitizeCsvCell(lead.status),
      sanitizeCsvCell(decryptPii(lead.messageEncrypted)),
      sanitizeCsvCell(lead.country),
      sanitizeCsvCell(lead.deviceType),
      sanitizeCsvCell(lead.browser),
      sanitizeCsvCell(lead.os),
      sanitizeCsvCell(lead.sourcePage),
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');

    await logAuditEvent({
      adminId: sessionRes.admin.id,
      action: 'EXPORT_LEADS',
      details: { exportCount: allLeads.length },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
    });

    const dateSlug = new Date().toISOString().slice(0, 10);
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="frxcx-leads-${dateSlug}.csv"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (err) {
    console.error('CSV export error:', err);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
