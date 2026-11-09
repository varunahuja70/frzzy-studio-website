import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Safely purges an admin and all associated dependent records from the local SQLite database.
 * Temporarily disables foreign key checks to prevent cascade deadlocks.
 */
export async function purgeLocalAdmin(adminId: string) {
  try {
    await db.run(sql`PRAGMA foreign_keys = OFF;`);
    await db.run(sql`DELETE FROM sessions WHERE admin_id = ${adminId}`);
    await db.run(sql`DELETE FROM recovery_codes WHERE admin_id = ${adminId}`);
    await db.run(sql`DELETE FROM password_history WHERE admin_id = ${adminId}`);
    await db.run(sql`DELETE FROM invites WHERE admin_id = ${adminId}`);
    await db.run(sql`DELETE FROM notifications WHERE recipient_id = ${adminId} OR actor_id = ${adminId}`);
    await db.run(sql`DELETE FROM admins WHERE id = ${adminId}`);
  } catch (err) {
    console.error(`[purgeLocalAdmin] Error deleting admin ${adminId}:`, err);
    throw err;
  } finally {
    try {
      await db.run(sql`PRAGMA foreign_keys = ON;`);
    } catch {}
  }
}
