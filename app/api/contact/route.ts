import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

// Strict schema with input sanitization
const ContactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name too long')
    .transform((str) => str.replace(/[<>]/g, '')), // Strip potential HTML tags
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
  category: z.enum([
    'Web Design & Dev',
    'Brand Identity',
    '3D & Motion',
    'Creative Direction',
    'Full Production',
  ]),
  message: z
    .string()
    .trim()
    .min(5, 'Message must be at least 5 characters')
    .max(2000, 'Message cannot exceed 2000 characters')
    .transform((str) => str.replace(/[<>]/g, '')),
  agreeToTerms: z.literal(true, {
    message: 'You must accept the terms',
  }),
  // Honeypot field (must be empty; bots automatically populate it)
  companyWebsite: z.string().max(0, 'Spam detected').optional().or(z.literal('')),
});

// In-memory sliding rate-limiter: max 5 form submissions per IP per 10 minutes
const submissionCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = submissionCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    submissionCounts.set(ip, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 5;
}

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      '127.0.0.1';

    if (isRateLimited(ip)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Too many requests. Please wait before submitting again.',
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

    // In a production backend, notify team via email or webhook here
    return NextResponse.json(
      {
        success: true,
        message: 'Inquiry received successfully. Our studio team will reach out within 24 hours.',
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred while processing your inquiry.' },
      { status: 500 }
    );
  }
}
