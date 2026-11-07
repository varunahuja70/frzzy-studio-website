import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { admins, recoveryCodes } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { validateAdminSession } from '@/lib/auth/session';
import { generateTotpSetup, generateRecoveryCodes, verifyTotpToken, hashRecoveryCode } from '@/lib/auth/totp';
import { logAuditEvent } from '@/lib/auth/audit';

export async function GET(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const isEnabled = Boolean(admin.twoFactorEnabled && admin.twoFactorSecret);

    return NextResponse.json({
      enabled: isEnabled,
      email: admin.email,
    });
  } catch (err) {
    console.error('2FA status check error:', err);
    return NextResponse.json({ error: 'Failed to retrieve 2FA status' }, { status: 500 });
  }
}

const SetupActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('setup'),
  }),
  z.object({
    action: z.literal('confirm'),
    code: z.string().trim().min(6).max(10),
    secret: z.string().trim().min(16),
    recoveryCodes: z.array(z.string()).min(1),
  }),
]);

export async function POST(req: NextRequest) {
  try {
    const sessionRes = await validateAdminSession(req);
    if (!sessionRes.valid || !sessionRes.admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    const json = await req.json();
    const parsed = SetupActionSchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 });
    }

    if (parsed.data.action === 'setup') {
      // Generate a fresh TOTP secret & QR code
      const totp = await generateTotpSetup(admin.email);
      const { plaintextCodes } = generateRecoveryCodes(10);

      return NextResponse.json({
        secret: totp.secret,
        otpauthUrl: totp.otpauthUrl,
        qrCodeDataUrl: totp.qrCodeDataUrl,
        recoveryCodes: plaintextCodes,
      });
    }

    if (parsed.data.action === 'confirm') {
      const { code, secret, recoveryCodes: rawRecoveryCodes } = parsed.data;

      // Verify that the code is valid for this secret
      const isValid = verifyTotpToken(code, secret);
      if (!isValid) {
        return NextResponse.json(
          { error: 'Invalid 6-digit verification code. Please check your authenticator app.' },
          { status: 400 }
        );
      }

      // 1. Save 2FA secret and mark 2FA active
      await db
        .update(admins)
        .set({
          twoFactorSecret: secret,
          twoFactorEnabled: true,
          mustSetup2Fa: false,
          updatedAt: Date.now(),
        })
        .where(eq(admins.id, admin.id));

      // 2. Hash and store emergency recovery codes
      await db.delete(recoveryCodes).where(eq(recoveryCodes.adminId, admin.id));
      for (const plainCode of rawRecoveryCodes) {
        const codeHash = hashRecoveryCode(plainCode);
        await db.insert(recoveryCodes).values({
          id: crypto.randomUUID(),
          adminId: admin.id,
          codeHash,
          used: false,
          createdAt: Date.now(),
        });
      }

      // 3. Log security audit event
      const ip =
        req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
        req.headers.get('x-real-ip') ||
        '127.0.0.1';
      const userAgent = req.headers.get('user-agent') || 'Unknown';

      await logAuditEvent({
        adminId: admin.id,
        action: 'TWO_FACTOR_VERIFIED',
        resource: admin.email,
        details: { method: 'totp_enrollment' },
        ipAddress: ip,
        userAgent,
      });

      return NextResponse.json({
        success: true,
        message: 'Two-Factor Authentication successfully enabled on your account.',
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err) {
    console.error('2FA management error:', err);
    return NextResponse.json({ error: 'Failed to process 2FA setup' }, { status: 500 });
  }
}
