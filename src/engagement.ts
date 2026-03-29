/**
 * Engagement event storage and retrieval for D1.
 */

export interface CardEngagement {
  cardId: string;
  timeSpentMs: number;
  variantViewCount: number;
}

export interface EngagementEvent {
  sessionId: string;
  hashedUserId?: string | null;
  feedId: string;
  cardId: string;
  timeSpentMs: number;
  variantViewCount: number;
  pageNumber?: number | null;
}

export interface EngagementPayload {
  sessionId?: string;
  hashedUserId?: string | null;
  engagement?: CardEngagement[];
}

/**
 * Batch-insert engagement events into D1.
 * Designed to be called inside ctx.waitUntil() so it doesn't block the response.
 */
export async function writeEngagementBatch(
  db: D1Database,
  events: EngagementEvent[],
): Promise<void> {
  if (events.length === 0) return;

  const stmt = db.prepare(
    `INSERT INTO engagement_events (session_id, hashed_user_id, feed_id, card_id, time_spent_ms, variant_view_count, page_number)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  const batch = events.map((e) =>
    stmt.bind(
      e.sessionId,
      e.hashedUserId ?? null,
      e.feedId,
      e.cardId,
      e.timeSpentMs,
      e.variantViewCount,
      e.pageNumber ?? null,
    ),
  );

  await db.batch(batch);
}

/**
 * Aggregate engagement stats, optionally filtered by feed.
 */
export async function getEngagementStats(
  db: D1Database,
  feedId?: string,
): Promise<{
  totalEvents: number;
  uniqueSessions: number;
  avgTimeSpentMs: number;
  avgVariantViewCount: number;
  feedBreakdown: Array<{
    feedId: string;
    events: number;
    uniqueSessions: number;
    avgTimeSpentMs: number;
  }>;
}> {
  const whereClause = feedId ? 'WHERE feed_id = ?' : '';
  const bindings = feedId ? [feedId] : [];

  const totals = await db
    .prepare(
      `SELECT
        COUNT(*) as total_events,
        COUNT(DISTINCT session_id) as unique_sessions,
        COALESCE(AVG(time_spent_ms), 0) as avg_time_spent_ms,
        COALESCE(AVG(variant_view_count), 0) as avg_variant_view_count
       FROM engagement_events ${whereClause}`,
    )
    .bind(...bindings)
    .first<{
      total_events: number;
      unique_sessions: number;
      avg_time_spent_ms: number;
      avg_variant_view_count: number;
    }>();

  const breakdownQuery = feedId
    ? `SELECT feed_id, COUNT(*) as events, COUNT(DISTINCT session_id) as unique_sessions, COALESCE(AVG(time_spent_ms), 0) as avg_time_spent_ms
       FROM engagement_events WHERE feed_id = ? GROUP BY feed_id`
    : `SELECT feed_id, COUNT(*) as events, COUNT(DISTINCT session_id) as unique_sessions, COALESCE(AVG(time_spent_ms), 0) as avg_time_spent_ms
       FROM engagement_events GROUP BY feed_id ORDER BY events DESC LIMIT 50`;

  const breakdown = await db
    .prepare(breakdownQuery)
    .bind(...bindings)
    .all<{
      feed_id: string;
      events: number;
      unique_sessions: number;
      avg_time_spent_ms: number;
    }>();

  return {
    totalEvents: totals?.total_events ?? 0,
    uniqueSessions: totals?.unique_sessions ?? 0,
    avgTimeSpentMs: Math.round(totals?.avg_time_spent_ms ?? 0),
    avgVariantViewCount: Math.round((totals?.avg_variant_view_count ?? 0) * 10) / 10,
    feedBreakdown: (breakdown.results ?? []).map((r) => ({
      feedId: r.feed_id,
      events: r.events,
      uniqueSessions: r.unique_sessions,
      avgTimeSpentMs: Math.round(r.avg_time_spent_ms),
    })),
  };
}
