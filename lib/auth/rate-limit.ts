import { db, ensureDatabaseReady } from '../db';
import { loginAttempts } from '../db/schema';
import { eq, and, gt, desc, or } from 'drizzle-orm';
import crypto from 'crypto';

export interface LockoutStatus {
  isLocked: boolean;
  remainingSeconds: number;
  failureCount: number;
}

/**
 * Checks if an IP or Email is currently locked out based on failed login attempts.
 */
export async function checkLoginLockout(
  email: string,
  ipAddress: string
): Promise<LockoutStatus> {
  await ensureDatabaseReady();

  const windowMs = 60 * 60 * 1000; // 1 hour lookback
  const since = Date.now() - windowMs;

  // Query recent failed attempts for this email or IP
  const attempts = await db
    .select()
    .from(loginAttempts)
    .where(
      and(
        gt(loginAttempts.createdAt, since),
        eq(loginAttempts.success, false),
        // Matched in the query: filtered afterwards, a flood of failures for other accounts
        // would push this account's failures out of the window and lift its lockout.
        or(eq(loginAttempts.email, email.toLowerCase().trim()), eq(loginAttempts.ipAddress, ipAddress))
      )
    )
    .orderBy(desc(loginAttempts.createdAt))
    .limit(20);

  const matchingFailures = attempts;

  const failureCount = matchingFailures.length;
  if (failureCount < 5) {
    return { isLocked: false, remainingSeconds: 0, failureCount };
  }

  const latest = matchingFailures[0];
  const elapsedSeconds = Math.floor((Date.now() - latest.createdAt) / 1000);

  let lockoutDurationSeconds = 60; // 1 min for 5 failures
  if (failureCount >= 10) {
    lockoutDurationSeconds = 60 * 60; // 1 hour
  } else if (failureCount >= 8) {
    lockoutDurationSeconds = 15 * 60; // 15 mins
  } else if (failureCount >= 5) {
    lockoutDurationSeconds = 5 * 60; // 5 mins
  }

  if (elapsedSeconds < lockoutDurationSeconds) {
    return {
      isLocked: true,
      remainingSeconds: lockoutDurationSeconds - elapsedSeconds,
      failureCount,
    };
  }

  return { isLocked: false, remainingSeconds: 0, failureCount };
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
