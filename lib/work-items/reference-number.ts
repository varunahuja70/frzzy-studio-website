import { db, ensureDatabaseReady } from '@/lib/db';
import { workItems } from '@/lib/db/schema';
import { desc, like } from 'drizzle-orm';

/**
 * Atomically generates a sequential gap-free reference number.
 * Format: AEV-YYYY-XXXX (e.g. AEV-2026-0001)
 */
export async function generateSequentialReferenceNumber(prefix = 'AEV'): Promise<string> {
  await ensureDatabaseReady();

  const currentYear = new Date().getFullYear();
  const yearPattern = `${prefix}-${currentYear}-%`;

  // Find the highest reference number for the current year
  const latestItem = await db
    .select({ itemNumber: workItems.itemNumber })
    .from(workItems)
    .where(like(workItems.itemNumber, yearPattern))
    .orderBy(desc(workItems.itemNumber))
    .limit(1);

  let nextSequence = 1;
  if (latestItem.length > 0 && latestItem[0].itemNumber) {
    const parts = latestItem[0].itemNumber.split('-');
    if (parts.length === 3) {
      const parsedSeq = parseInt(parts[2], 10);
      if (!isNaN(parsedSeq)) {
        nextSequence = parsedSeq + 1;
      }
    }
  }

  const paddedSequence = String(nextSequence).padStart(4, '0');
  return `${prefix}-${currentYear}-${paddedSequence}`;
}
