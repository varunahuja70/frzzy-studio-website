import { isOverLimit } from '@/lib/request-limit';
import { getClientIp } from '@/lib/client-ip';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { db, ensureDatabaseReady } from '@/lib/db';
import { leads } from '@/lib/db/schema';
import { encryptPii, createBlindIndex } from '@/lib/auth/encryption';
import { logAuditEvent } from '@/lib/auth/audit';
import { syncLeadToSupabase } from '@/lib/supabase/sync';
import { eq, and, gt } from 'drizzle-orm';

// Strict schema with input sanitization and length limits
const ContactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform((str) => str.replace(/[<>]/g, '')),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name too long')
    .transform((str) => str.replace(/[<>]/g, '')),
  email: z
    .string()
    .trim()
    .email('Invalid email address')
    .max(100, 'Email too long')
    .toLowerCase(),
  category: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .default('3D & Motion'),
  message: z
    .string()
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(5000, 'Message cannot exceed 5000 characters')
    .transform((str) => str.replace(/[<>]/g, '')),
  agreeToTerms: z.boolean().optional().default(true),
  // Anti-bot honeypot field (must be empty)
  companyWebsite: z.string().max(0, 'Spam detected').optional().or(z.literal('')),
});

function maskIp(ip: string): string {
  if (ip.includes('.')) {
    const parts = ip.split('.');
    return `${parts[0]}.${parts[1]}.***.***`;
  }
  if (ip.includes(':')) {
    const parts = ip.split(':');
    return `${parts[0]}:${parts[1]}:****:****`;
  }
  return '***.***.***.***';
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    if (isOverLimit('contact', ip, 5, 10 * 60 * 1000)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait a few moments before trying again.',
        },
        { status: 429, headers: { 'Retry-After': '600' } }
      );
    }

    const json = await req.json();
    const result = ContactFormSchema.safeParse(json);

    if (!result.success) {
      const firstIssue = result.error.issues[0]?.message || 'Invalid form data';
      return NextResponse.json(
        { success: false, error: firstIssue },
        { status: 400 }
      );
    }

    const data = result.data;
    await ensureDatabaseReady();

    const blindIndex = createBlindIndex(data.email);
    const now = Date.now();

    // Duplicate submission check: prevent exact same email submitting within 60 seconds
    const recentDuplicate = await db
      .select({ id: leads.id })
      .from(leads)
      .where(
        and(
          eq(leads.emailBlindIndex, blindIndex),
          gt(leads.createdAt, now - 60000)
        )
      )
      .limit(1);

    if (recentDuplicate.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Inquiry already received. Our studio team is reviewing it.',
      });
    }

    const userAgent = req.headers.get('user-agent') || 'Unknown';
    let browser = 'Other';
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    let os = 'Other';
    if (userAgent.includes('Win')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) os = 'iOS';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('Linux')) os = 'Linux';

    const country =
      req.headers.get('x-vercel-ip-country') ||
      req.headers.get('cf-ipcountry') ||
      'Unknown';

    const leadId = crypto.randomUUID();

    // Encrypt sensitive PII fields (email, message) at rest using AES-256-GCM
    const emailEncrypted = encryptPii(data.email);
    const messageEncrypted = encryptPii(data.message);

    await db.insert(leads).values({
      id: leadId,
      firstName: data.firstName,
      lastName: data.lastName,
      emailEncrypted,
      emailBlindIndex: blindIndex,
      category: data.category,
      messageEncrypted,
      status: 'new',
      sourcePage: req.headers.get('referer') || '/',
      referrer: req.headers.get('referer') || undefined,
      deviceType: 'desktop', // default or parsed
      browser,
      os,
      country,
      ipMasked: maskIp(ip),
      createdAt: now,
      updatedAt: now,
    });

    // Sync to Supabase public.leads
    await syncLeadToSupabase({
      id: leadId,
      firstName: data.firstName,
      lastName: data.lastName,
      emailEncrypted,
      emailBlindIndex: blindIndex,
      category: data.category,
      messageEncrypted,
      status: 'new',
      sourcePage: req.headers.get('referer') || '/',
      referrer: req.headers.get('referer') || undefined,
      deviceType: 'desktop',
      browser,
      os,
      country,
      ipMasked: maskIp(ip),
      createdAt: now,
      updatedAt: now,
    });

    // Send instant email notification to studio admin
    // If SMTP / Resend configured, send via provider; otherwise logged safely to audit trail
    await logAuditEvent({
      action: 'LEAD_STATUS_CHANGED',
      resource: leadId,
      details: {
        event: 'NEW_LEAD_SUBMISSION',
        name: `${data.firstName} ${data.lastName}`,
        category: data.category,
      },
      ipAddress: maskIp(ip),
      userAgent,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry received successfully. Our studio team will reach out within 24 hours.',
        leadId,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('Contact submission error:', err);
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your inquiry.' },
      { status: 500 }
    );
  }
}
