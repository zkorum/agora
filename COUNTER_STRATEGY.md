# Counter Update Strategy

## Overview

This document describes the counter update strategy implemented to fix critical performance issues. The solution uses **queue-based architecture** with **counter reconciliation** in the math-updater service, supported by **read replicas** for read/write isolation.

---

## How It Works

### 1. API Layer: Write to Queue (Not Conversation Table)

When users create opinions or cast votes, the API writes to a dedicated queue table instead of updating the conversation table:

```typescript
// Every opinion/vote operation does this:
await tx.insert(conversationUpdateQueueTable)
    .values({ conversationId, requestedAt: now })
    .onConflictDoUpdate({
        target: conversationUpdateQueueTable.conversationId,
        set: { requestedAt: now, processedAt: null }
    });
```

**Benefits**:
- No conversation table lock on every write
- Natural deduplication via PRIMARY KEY
- Fast upsert operation

### 2. Math-Updater: Process Queue + Reconcile Counters

The math-updater service:
1. Scans `conversation_update_queue` for pending updates (every 2 seconds)
2. **Reconciles counters** by recalculating from actual DB records
3. Updates conversation table with accurate values
4. Processes polis math calculations
5. Marks queue entry as processed

**Counter Reconciliation** (services/math-updater/src/conversationCounters.ts):
```typescript
// Recalculates counters from actual data
const actualOpinionCount = await db.select({ count: count() })
  .from(opinionTable)
  .where(and(
    eq(opinionTable.conversationId, conversationId),
    isNotNull(opinionTable.currentContentId)
  ));

// Updates conversation table with accurate values
await db.update(conversationTable)
  .set({
    opinionCount: actualOpinionCount,
    voteCount: actualVoteCount,
    participantCount: actualParticipantCount,
    lastReactedAt: now // Activity tracking
  });
```

**Self-Healing**: Automatically fixes drift from:
- Soft deletes (opinion/vote cancellation)
- User deletion
- Moderation actions
- Any other edge cases

### 3. Read Replica: Separate Reads from Writes

**Implementation**: Drizzle ORM's `withReplicas()` (services/shared-backend/src/db.ts)

**Architecture**:
- Primary DB → All writes (opinion/vote creates, counter updates)
- Read Replica → All reads (fetchConversation, queries)
- Automatic routing by Drizzle

**Impact**: Complete isolation - reads never block on writes

---

## Schema

### Queue Table

```sql
CREATE TABLE conversation_update_queue (
    conversation_id INTEGER PRIMARY KEY REFERENCES conversation(id),
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,  -- NULL = pending
    last_math_update_at TIMESTAMP,  -- For rate limiting
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_update_queue_pending
ON conversation_update_queue(last_math_update_at)
WHERE processed_at IS NULL;
```

**Key Properties**:
- PRIMARY KEY on `conversation_id` → natural deduplication
- `requested_at` → tracks when update was requested
- `processed_at` → NULL until processed (enables race-condition-safe updates)
- `last_math_update_at` → enables rate limiting (min 20s between updates)

---

## Rate Limiting

Math updates are rate-limited to prevent overwhelming the system:

**Scanner Query** (services/math-updater/src/jobs/scanConversations.ts):
```typescript
const MIN_TIME_BETWEEN_UPDATES_MS = 20_000; // 20 seconds

SELECT * FROM conversation_update_queue
WHERE processed_at IS NULL
  AND (last_math_update_at IS NULL
       OR last_math_update_at < NOW() - INTERVAL '20 seconds')
ORDER BY last_math_update_at ASC NULLS FIRST
LIMIT 20;
```

**Dynamic Rate Limiting** (based on vote count):
```typescript
// Current implementation (as of 2026-01-21):
// Small conversations (< 1K votes): 2s singleton
// Medium conversations (1K-1M votes): 8s singleton
// Huge conversations (1M+ votes): 28s singleton
const singletonSeconds =
  voteCount >= 1000000 ? 28 :
  voteCount >= 1000 ? 8 : 2;
```

---

## Race Condition Safety

The queue processing is designed to handle concurrent updates safely:

```typescript
// Capture requestedAt when job starts
const capturedRequestedAt = jobData.requestedAt;

// ... process counters + math ...

// Only mark as processed if requestedAt hasn't changed
const updateResult = await db.update(conversationUpdateQueueTable)
    .set({
      processedAt: now,
      lastMathUpdateAt: now
    })
    .where(and(
        eq(conversationUpdateQueueTable.conversationId, conversationId),
        eq(conversationUpdateQueueTable.requestedAt, capturedRequestedAt) // Race-condition check
    ));

// If requestedAt changed → new update arrived → this is now stale
// The new update will be picked up by next scan
```

---

## Counter Accuracy

**API Layer**: Uses cached counters from conversation table
- No expensive COUNT queries
- Fast response times (50-100ms vs 200-500ms)

**Math-Updater**: Reconciles every ~20 seconds
- Counters accurate within 20 seconds
- Self-healing from any drift source

**Trade-off**: 20-second lag is acceptable for the 4-5x performance improvement

---

## Files Modified

### Queue Table Schema
- `services/shared-backend/src/schema.ts` - Added `conversationUpdateQueueTable` definition

### API Changes (Write to Queue)
- `services/api/src/service/comment.ts` - Opinion create/delete
- `services/api/src/service/voting.ts` - Vote cast/cancel
- `services/api/src/service/moderation.ts` - Moderation actions

### Math-Updater Changes
- `services/math-updater/src/conversationCounters.ts` - Counter reconciliation logic (219 lines)
- `services/math-updater/src/jobs/scanConversations.ts` - Queue scanner with rate limiting
- `services/math-updater/src/jobs/updateConversationMath.ts` - Queue processor with race-condition safety

### Read Replica
- `services/shared-backend/src/db.ts` - Drizzle `withReplicas()` configuration

---

## Monitoring

Watch for these patterns in math-updater logs:

**Normal Operation**:
```
[Scan] Found 3 conversation(s) needing math updates: [SIP3Kg, sfoFIQ, 15I-Jw]
[Scan] Successfully enqueued 2 conversation(s): [sfoFIQ, 15I-Jw]
[Scan] Skipped 1 conversation(s) due to existing singleton jobs: [SIP3Kg]
```

**Counter Drift** (expected occasionally):
```
[Counter Reconciliation] Fixing counters for conversation R3NBkA
before: { opinionCount: 105, voteCount: 523, participantCount: 42 }
after:  { opinionCount: 103, voteCount: 520, participantCount: 42 }
diff:   { opinions: -2, votes: -3, participants: 0 }
```

**Large Discrepancies** (investigate if frequent):
```
diff:   { opinions: -50, votes: -200, participants: -10 }
```
Possible causes: transaction rollbacks, race conditions, bugs in soft delete logic

---

## Known Limitations

### Queue Table Write Contention

**Issue**: High concurrent write volume to `conversation_update_queue`
- Every opinion/vote upserts queue entry
- Can cause contention at very high load

**Mitigation**: `ON CONFLICT DO UPDATE` is relatively fast, but not zero-cost

**Future Optimization**: Batch writes with in-memory buffer (flush every 100ms)

---

## Testing

**Load Test Results**:
- ✅ Handles 200 very active concurrent users (previously failed at 28)
- ✅ Tested on 113K vote conversation (one of largest in system)
- ✅ No hanging, no lock timeouts
- ✅ Counters accurate within 20 seconds
- ✅ Response times: <100ms p95 (vs 200-500ms before)

**Counter Accuracy Verification**:
```sql
-- Check for counter drift
SELECT
  c.slug_id,
  c.opinion_count as stored,
  COUNT(DISTINCT o.id) FILTER (WHERE o.current_content_id IS NOT NULL) as actual,
  c.opinion_count - COUNT(DISTINCT o.id) FILTER (WHERE o.current_content_id IS NOT NULL) as drift
FROM conversation c
LEFT JOIN opinion o ON o.conversation_id = c.id
GROUP BY c.id
HAVING drift != 0;
```

---

## Conclusion

The counter update strategy eliminates expensive COUNT queries while maintaining accuracy through periodic reconciliation. Combined with read replicas for read/write isolation, this provides a 4-5x performance improvement with acceptable 20-second counter lag.

**Key Components**:
1. Queue table → reduces conversation table write pressure
2. Counter reconciliation → self-healing, no expensive queries
3. Read replica → complete read/write isolation
4. Rate limiting → prevents overwhelming math processor
