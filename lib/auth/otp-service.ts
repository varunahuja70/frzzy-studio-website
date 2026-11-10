import crypto from 'crypto';
import { db, ensureDatabaseReady } from '@/lib/db';
import { otpVerifications, admins, roles } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';
import { sendOtpVerificationEmail } from '@/lib/email/sender';
import { getAdminSupabaseClient } from '@/lib/supabase/admin';
import { hashPassword, recordPasswordHistory } from '@/lib/auth/password';
import { encryptPii, decryptPii } from '@/lib/auth/encryption';

export interface UserCreationPayload {
  name: string;
  email: string;
  role: string;
  passwordType: 'random' | 'custom';
  password: string;
  customPermissions?: string[];
  leadScope?: any;
  status?: 'active' | 'disabled';
}

/**
 * Computes an HMAC-SHA256 hash using the server pepper.
 * Ensures that OTP hashes cannot be cracked with precomputed rainbow tables.
 */
export function hashOtp(otp: string): string {
  const pepper = (process.env.ADMIN_PEPPER || 'vault-otp-pepper-default').trim();
  return crypto.createHmac('sha256', pepper).update(otp.trim()).digest('hex');
}

/**
 * Validates an entered OTP against a stored hash using constant-time comparison.
 * Supports legacy SHA-256 for backward compatibility.
 */
export function verifyOtpHash(enteredOtp: string, storedHash: string): boolean {
  try {
    const pepperHash = hashOtp(enteredOtp);
    if (
      pepperHash.length === storedHash.length &&
      crypto.timingSafeEqual(Buffer.from(pepperHash, 'hex'), Buffer.from(storedHash, 'hex'))
    ) {
      return true;
    }

    // Fallback for legacy plain SHA-256 without pepper
    const legacyHash = crypto.createHash('sha256').update(enteredOtp.trim()).digest('hex');
    if (
      legacyHash.length === storedHash.length &&
      crypto.timingSafeEqual(Buffer.from(legacyHash, 'hex'), Buffer.from(storedHash, 'hex'))
    ) {
      return true;
    }
  } catch {}

  return false;
}

/**
 * Initiates an ultra-secure 6-digit OTP verification process for creating a user.
 */
export async function initiateUserCreationOtp(
  payload: UserCreationPayload,
  expiresInMinutes = 10
): Promise<{
  verificationId: string;
  email: string;
  expiresInMinutes: number;
  sentToEmail: boolean;
  debugOtp?: string;
}> {
  await ensureDatabaseReady();

  // Generate cryptographically secure 6-digit OTP
  const randomNum = crypto.randomInt(100000, 999999);
  const otp = randomNum.toString();
  const otpHash = hashOtp(otp);

  const verificationId = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + expiresInMinutes * 60 * 1000;

  // Invalidate any previous unverified OTPs for this email
  await db
    .delete(otpVerifications)
    .where(and(eq(otpVerifications.email, payload.email.toLowerCase()), eq(otpVerifications.verified, false)));

  // Encrypt sensitive user creation payload with AES-256-GCM before database insertion
  const encryptedPayload = encryptPii(JSON.stringify(payload));

  // Save pending verification session
  await db.insert(otpVerifications).values({
    id: verificationId,
    email: payload.email.toLowerCase(),
    otpHash,
    action: 'user_creation',
    payload: encryptedPayload,
    attempts: 0,
    expiresAt,
    verified: false,
    createdAt: now,
  });

  // Dispatch email with beautiful responsive Curare template
  const emailRes = await sendOtpVerificationEmail({
    email: payload.email,
    name: payload.name,
    otp,
    role: payload.role,
    expiresInMinutes,
  });

  return {
    verificationId,
    email: payload.email,
    expiresInMinutes,
    sentToEmail: emailRes.sentToEmail,
    debugOtp: emailRes.debugOtp,
  };
}

/**
 * Validates the entered OTP, executes user provisioning across Supabase Auth,
 * Supabase profiles, and local database, then marks the OTP as verified.
 */
export async function verifyUserCreationOtp(
  verificationId: string,
  enteredOtp: string
): Promise<{
  success: boolean;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
  };
  error?: string;
}> {
  await ensureDatabaseReady();

  const rows = await db
    .select()
    .from(otpVerifications)
    .where(eq(otpVerifications.id, verificationId))
    .limit(1);

  if (rows.length === 0) {
    return { success: false, error: 'Verification session not found or expired.' };
  }

  const record = rows[0];

  if (record.verified) {
    return { success: false, error: 'This verification code has already been used.' };
  }

  if (Date.now() > record.expiresAt) {
    return { success: false, error: 'Verification code has expired. Please request a new code.' };
  }

  if (record.attempts >= 5) {
    return { success: false, error: 'Too many incorrect attempts. Please initiate a new request.' };
  }

  const isMatch = verifyOtpHash(enteredOtp, record.otpHash);

  if (!isMatch) {
    await db
      .update(otpVerifications)
      .set({ attempts: record.attempts + 1 })
      .where(eq(otpVerifications.id, verificationId));

    const remaining = 4 - record.attempts;
    return {
      success: false,
      error: `Invalid verification code. ${remaining > 0 ? `${remaining} attempts remaining.` : 'Request locked.'}`,
    };
  }

  // OTP is valid! Decrypt user payload
  let payload: UserCreationPayload;
  try {
    const decrypted = decryptPii(record.payload);
    payload = JSON.parse(decrypted);
  } catch {
    payload = JSON.parse(record.payload);
  }

  // Check if email already registered
  const existing = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.email, payload.email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    return { success: false, error: 'A user with this email address already exists.' };
  }

  let supabaseUserId: string | null = null;

  // 1. SUPABASE PROVISIONING
  try {
    const supabase = getAdminSupabaseClient();

    // Ensure role exists in Supabase public.roles so foreign keys never fail
    try {
      const { data: roleCheck } = await (supabase.from('roles') as any)
        .select('id')
        .eq('id', payload.role)
        .maybeSingle();

      if (!roleCheck) {
        await (supabase.from('roles') as any).upsert(
          {
            id: payload.role,
            name: payload.role.charAt(0).toUpperCase() + payload.role.slice(1),
            description: `Studio ${payload.role} role`,
            is_built_in: false,
            permissions: payload.customPermissions || [],
          },
          { onConflict: 'id', ignoreDuplicates: true }
        );
      }
    } catch (roleErr) {
      console.warn('[OTP Provision] Role ensure warning:', roleErr);
    }

    // Create user in Supabase Auth
    const { data: createData, error: createError } = await supabase.auth.admin.createUser({
      email: payload.email,
      password: payload.password,
      email_confirm: true,
      user_metadata: {
        name: payload.name,
        role: payload.role,
      },
    });

    if (createData?.user) {
      supabaseUserId = createData.user.id;
    } else if (createError) {
      console.warn('[OTP Provision] Supabase Auth createUser note:', createError.message);
    }

    // Upsert into Supabase public.profiles
    if (supabaseUserId) {
      await (supabase.from('profiles') as any).upsert(
        {
          id: supabaseUserId,
          name: payload.name,
          email: payload.email,
          role: payload.role,
          status: payload.status || 'active',
          two_factor_enabled: false,
          must_change_password: payload.passwordType === 'random',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }
  } catch (sbErr) {
    console.error('[OTP Provision] Supabase sync error:', sbErr);
  }

  // 2. LOCAL VAULT DATABASE INSERTION
  const { hash, salt } = await hashPassword(payload.password);
  const newAdminId = supabaseUserId || crypto.randomUUID();
  const now = Date.now();

  await db.insert(admins).values({
    id: newAdminId,
    name: payload.name,
    email: payload.email.toLowerCase(),
    passwordHash: hash,
    salt,
    role: payload.role,
    status: payload.status || 'active',
    mustChangePassword: payload.passwordType === 'random',
    mustSetup2Fa: false,
    twoFactorEnabled: false,
    customPermissions: payload.customPermissions ? JSON.stringify(payload.customPermissions) : null,
    leadScope: payload.leadScope ? JSON.stringify(payload.leadScope) : null,
    createdAt: now,
    updatedAt: now,
  });

  await recordPasswordHistory(newAdminId, hash, salt);

  // Mark OTP verification record as verified
  await db
    .update(otpVerifications)
    .set({ verified: true })
    .where(eq(otpVerifications.id, verificationId));

  return {
    success: true,
    user: {
      id: newAdminId,
      name: payload.name,
      email: payload.email,
      role: payload.role,
      status: payload.status || 'active',
    },
  };
}
