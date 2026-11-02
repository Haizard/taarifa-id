import { and, desc, eq } from 'drizzle-orm';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';
import { notFound } from '../errors';

export async function notifyAccount(recipientId: string, dedupeKey: string, category: string, title: string, body: string, resourcePath?: string | null) {
  try {
    await db.insert(schema.userNotifications).values({ recipient_account_id: recipientId, dedupe_key: dedupeKey.slice(0, 180), category: category.slice(0, 40), title: title.slice(0, 180), body, resource_path: resourcePath ?? null }).onConflictDoNothing();
  } catch {
    // Notifications should never block the underlying service operation.
  }
}

export async function listMyNotifications(accountId: string) {
  const rows = await db.select().from(schema.userNotifications).where(eq(schema.userNotifications.recipient_account_id, accountId)).orderBy(desc(schema.userNotifications.created_at)).limit(100);
  return { unread_count: rows.filter((row) => !row.read_at).length, items: rows };
}

export async function markNotificationRead(accountId: string, id: string) {
  const [updated] = await db.update(schema.userNotifications).set({ read_at: new Date() })
    .where(and(eq(schema.userNotifications.id, id), eq(schema.userNotifications.recipient_account_id, accountId))).returning({ id: schema.userNotifications.id });
  if (!updated) throw notFound('Notification not found');
  return { id: updated.id, read: true };
}
