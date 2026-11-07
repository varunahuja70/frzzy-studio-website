import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateAdminSession } from '@/lib/auth/session';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  checkPasswordHistory,
  recordPasswordHistory,
} from '@/lib/auth/password';
import { logAuditEvent } from '@/lib/auth/audit';

const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).optional(),
  newPassword: z.string().min(12).max(256),
});

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession();
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const json = await req.json();
    const parsed = ChangePasswordSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid password format (minimum 12 characters)' }, { status: 400 });
    }

    const { currentPassword, newPassword } = parsed.data;

    await ensureDatabaseReady();

    const adminRows = await db
      .select()
      .from(admins)
      .where(eq(admins.id, sessionRes.admin.id))
      .limit(1);

    if (adminRows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const admin = adminRows[0];

    // If not first-time forced change, verify current password
    if (!admin.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json({ error: 'Current password is required' }, { status: 400 });
      }
      const validCurrent = await verifyPassword(currentPassword, admin.passwordHash, admin.salt);
      if (!validCurrent) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 });
      }
    }

    // Validate password policy (entropy + breach lists)
    const policy = await validatePasswordPolicy(newPassword);
    if (!policy.valid) {
      return NextResponse.json({ error: policy.errors[0] || 'Password does not meet security requirements' }, { status: 400 });
    }

    // Check password history (cannot reuse any of the last 5 passwords)
    const isReused = await checkPasswordHistory(admin.id, newPassword);
    if (isReused) {
      return NextResponse.json(
        { error: 'Security policy: You cannot reuse any of your last 5 passwords.' },
        { status: 400 }
      );
    }

    const { hash, salt } = await hashPassword(newPassword);

    // Update admin
    await db
      .update(admins)
      .set({
        passwordHash: hash,
        salt,
        mustChangePassword: false,
        updatedAt: Date.now(),
      })
      .where(eq(admins.id, admin.id));

    // Record into password history
    await recordPasswordHistory(admin.id, hash, salt);

    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    await logAuditEvent({
      adminId: admin.id,
      action: 'PASSWORD_CHANGED',
      resource: admin.email,
      details: { forcedChange: Boolean(admin.mustChangePassword) },
      ipAddress: ip,
      userAgent: req.headers.get('user-agent') || undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Password updated successfully.',
    });
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
