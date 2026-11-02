import { and, eq, lt, sql } from 'drizzle-orm';
import { ApiError } from '../errors';
import * as schema from '@taarifa/db/schema';
import { db } from '../db';

export async function enforceRateLimit(subjectKey: string, action: string, limit: number, windowMs: number) {
  const now = Date.now();
  const windowStartedAt = new Date(Math.floor(now / windowMs) * windowMs);
  const [bucket] = await db.insert(schema.apiRateLimitBuckets).values({
    subject_key: subjectKey.slice(0, 255), action, window_started_at: windowStartedAt, count: 1,
  }).onConflictDoUpdate({
    target: [schema.apiRateLimitBuckets.subject_key, schema.apiRateLimitBuckets.action],
    set: {
      window_started_at: sql`case when ${schema.apiRateLimitBuckets.window_started_at} < ${windowStartedAt} then ${windowStartedAt} else ${schema.apiRateLimitBuckets.window_started_at} end`,
      count: sql`case when ${schema.apiRateLimitBuckets.window_started_at} < ${windowStartedAt} then 1 else ${schema.apiRateLimitBuckets.count} + 1 end`,
    },
    setWhere: sql`${schema.apiRateLimitBuckets.window_started_at} < ${windowStartedAt} or ${schema.apiRateLimitBuckets.count} < ${limit}`,
  }).returning({ count: schema.apiRateLimitBuckets.count });
  if (!bucket) throw new ApiError(429, 'Too many requests. Wait and try again.');
}

export async function recordActivity(actorAccountId: string | null, action: string, resourceId: string | null = null, outcome = 'attempted') {
  await db.insert(schema.platformActivityEvents).values({
    actor_account_id: actorAccountId,
    action,
    resource_id: resourceId?.slice(0, 100) ?? null,
    outcome,
  });
  if (Math.random() < 0.02) {
    const cutoff = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);
    await db.delete(schema.platformActivityEvents).where(lt(schema.platformActivityEvents.created_at, cutoff));
  }
}

export function routeActivity(method: string, segments: string[]) {
  if (method === 'GET' && segments[0] === 'employer' && segments[1] === 'candidates') return { action: 'candidate_search', limit: 30, windowMs: 60_000, resourceId: null };
  if (method === 'GET' && segments[0] === 'employer' && segments[1] === 'jobs' && segments[3] === 'applications') return { action: 'applicant_career_view', limit: 60, windowMs: 60_000, resourceId: segments[2] ?? null };
  if (method === 'POST' && segments[0] === 'jobs' && segments[2] === 'apply') return { action: 'job_application', limit: 10, windowMs: 24 * 60 * 60_000, resourceId: segments[1] ?? null };
  if (method === 'POST' && segments[0] === 'employer' && segments[1] === 'jobs' && segments[3] === 'invitations') return { action: 'candidate_invitation', limit: 20, windowMs: 60 * 60_000, resourceId: segments[2] ?? null };
  if (method === 'POST' && segments.includes('messages')) return { action: 'job_message', limit: 50, windowMs: 60 * 60_000, resourceId: segments[2] ?? null };
  if (method === 'POST' && segments[0] === 'marketplace' && segments[1] === 'requests' && segments.length === 2) return { action: 'service_request', limit: 10, windowMs: 60 * 60_000, resourceId: null };
  if (method === 'POST' && segments[0] === 'marketplace' && segments[1] === 'requests' && segments[3] === 'offers') return { action: 'service_offer', limit: 30, windowMs: 60 * 60_000, resourceId: segments[2] ?? null };
  if (method === 'POST' && segments[0] === 'marketplace' && segments[1] === 'requests' && segments[3] === 'complaints') return { action: 'service_complaint', limit: 5, windowMs: 24 * 60 * 60_000, resourceId: segments[2] ?? null };
  if (method === 'POST' && segments[0] === 'marketplace' && segments[1] === 'provider' && segments[2] === 'verification') return { action: 'provider_verification_submission', limit: 5, windowMs: 24 * 60 * 60_000, resourceId: null };
  if (method === 'GET' && segments[0] === 'career' && segments[1] === 'share') return { action: 'career_share_access', limit: 30, windowMs: 60_000, resourceId: null };
  if (method === 'GET' && segments[0] === 'marketplace' && segments[1] === 'complaints') return { action: 'complaint_case_view', limit: 60, windowMs: 60_000, resourceId: null };
  return null;
}
