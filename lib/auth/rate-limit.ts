import { db, ensureDatabaseReady } from '../db';
import { loginAttempts } from '../db/schema';
import { eq, and, gt, desc, or } from 'drizzle-orm';
import crypto from 'crypto';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failureCount: number;
  attemptsRemaining: number;
}

/**
 * Checks if an IP or Email is currently locked out based on failed login attempts.
 * Policy: Allows 10 attempts. On 10th failure, triggers a 5-minute (300 seconds) lockout.
 */
export async function checkLoginLockout(
  email: string,
  ipAddress: string,
  maxAttempts = 10
): Promise<LockoutStatus> {
  await ensureDatabaseReady();

  const windowMs = 15 * 60 * 1000; // 15-minute rolling window
  const since = Date.now() - windowMs;

  // Query recent failed attempts for this email or IP
  const attempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        gt(loginAttempts.createdAt, since),
        eq(loginAttempts.success, false),
        or(eq(loginAttempts.email, email.toLowerCase().trim()), eq(loginAttempts.ipAddress, ipAddress))
      )
    )
    .orderBy(desc(loginAttempts.createdAt))
    .limit(30);

  const matchingFailures = attempts;
  const failureCount = matchingFailures.length;
  const attemptsRemaining = Math.max(0, maxAttempts - failureCount);

  if (failureCount < maxAttempts) {
    return { isLocked: false, remainingSeconds: 0, failureCount, attemptsRemaining };
  }

  const latest = matchingFailures[0];
  const elapsedSeconds = Math.floor((Date.now() - latest.createdAt) / 1000);
  const lockoutDurationSeconds = 5 * 60; // 5 minutes timer (300 seconds)

  if (elapsedSeconds < lockoutDurationSeconds) {
    return {
      isLocked: true,
      remainingSeconds: lockoutDurationSeconds - elapsedSeconds,
      failureCount,
      attemptsRemaining: 0,
    };
  }

  return { isLocked: false, remainingSeconds: 0, failureCount, attemptsRemaining: maxAttempts };
}

/**
 * Records a login attempt into the database for audit and brute-force tracking.
 */
export async function recordLoginAttempt(
  email: string,
  ipAddress: string,
  success: boolean,
  reason?: string
): Promise<void> {
  await ensureDatabaseReady();

  await db.insert(loginAttempts).values({
    id: crypto.randomUUID(),
    email: email.toLowerCase().trim(),
    ipAddress,
    success,
    reason,
    createdAt: Date.now(),
  });
}
