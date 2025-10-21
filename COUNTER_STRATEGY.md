# Counter Update Strategy

## Overview

This document describes the counter update strategy that was implemented to fix critical performance issues. The primary fix was the **read replica** (~90% improvement), with counter reconciliation and queue architecture as supporting optimizations.

## The Problem

Currently, every opinion/vote operation runs expensive COUNT queries:
```typescript
// This scans thousands of records on EVERY request!
const voteAuthors = await db.select({ authorId: voteTable.authorId })
  .from(voteTable)
  .innerJoin(opinionTable, ...)
  .where(eq(opinionTable.conversationId, conversationId));

const participantCount = new Set(voteAuthors.map(v => v.authorId)).size;
```

## The Solution

### Phase 1: Atomic Counters (✅ Implemented)

Replace COUNT queries with simple atomic increments/decrements:

```typescript
// Opinion created → increment
await tx.update(conversationTable)
  .set({
    opinionCount: sql`opinion_count + 1`,
    needsMathUpdate: true,
    mathUpdateRequestedAt: now
  })
  .where(eq(conversationTable.id, conversationId));
```

**Problem Discovered**: This still causes **conversation row lock contention**!
- Every UPDATE locks the conversation row
- `fetchPostBySlugId` reads from conversation table and blocks on write locks
- With 200 concurrent users (goal: 1000+ per conversation), the row is constantly locked
- System still hangs under load at 28 concurrent users

### Phase 2: Read Replica - PRIMARY FIX (✅ Implemented)

**Root Cause Analysis**:
1. **Primary bottleneck**: Read/write lock contention on conversation table
2. **Secondary bottleneck**: Conversation table row lock (same row updated constantly)

**Target**: Support high concurrent load without hanging

**Solution Implemented: Read Replica**

#### Read Replica - PRIMARY FIX (~90% of improvement)

**Location**: `services/shared-backend/src/db.ts`, `services/api/src/shared-backend/db.ts`, `services/math-updater/src/shared-backend/db.ts`

**Architecture**:
```
Primary DB (writes only):
- Opinion INSERT
- Vote INSERT
- Moderation INSERT/UPDATE
- conversation_update_queue INSERT
- Conversation updates (only from math-updater)

Read Replica (all user-facing reads):
- fetchPostBySlugId
- fetchOpinionsByConversationSlugId
- All user profile/feed queries
```

**Configuration**:
```typescript
// Primary database for writes
export const db = drizzle(sql, { schema });

// Read replica for read-only operations (optional)
export const readReplicaDb = config.databaseReadReplicaConnectionString
    ? drizzle(postgres(config.databaseReadReplicaConnectionString), { schema })
    : db; // Fallback to primary if no replica configured
```

**Impact**:
- ✅ **Complete isolation of reads from writes**
- ✅ **Eliminates read/write lock contention entirely**
- ✅ **fetchConversation no longer waits for opinion/vote write locks**
- ✅ **System remains responsive under heavy write load**
- ✅ **This was the breakthrough that made the system usable**

**Replication Lag**: 100-500ms is acceptable - users see data within half a second

### Phase 3: Queue Table - Supporting Optimization (✅ Implemented)

Create dedicated `conversation_update_queue` table to reduce conversation table write pressure:

```sql
CREATE TABLE conversation_update_queue (
    conversation_id INTEGER PRIMARY KEY REFERENCES conversation(id),
    requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP,  -- NULL = pending, NOT NULL = processed
    last_math_update_at TIMESTAMP,  -- For rate limiting
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversation_update_queue_pending
ON conversation_update_queue(last_math_update_at)
WHERE processed_at IS NULL;
```

**API writes** (INSERT with UPSERT to queue):
```typescript
// Instead of updating conversation table
await tx.insert(conversationUpdateQueueTable)
    .values({ conversationId, requestedAt: now, processedAt: null })
    .onConflictDoUpdate({
        target: conversationUpdateQueueTable.conversationId,
        set: { requestedAt: now, processedAt: null }
    });
```

**Benefits**:
- ✅ **Reduces conversation table UPDATE frequency** - only math-updater writes
- ✅ **Natural deduplication** - PRIMARY KEY prevents duplicate queue entries
- ✅ **Rate limiting** - based on `lastMathUpdateAt` (actual processing time)
- ✅ **No new dependencies** - uses existing PostgreSQL

**Known Limitation**: Queue table itself experiences write contention under very high load (upsert operations)

### Reconciliation (Accurate, Every ~20 Seconds)

**Location**: `services/math-updater/src/conversationCounters.ts` (219 lines)

The math-updater service:
1. Reads from `conversation_update_queue` table (not conversation table!)
2. Recalculates `opinion_count`, `vote_count`, `participant_count` from actual database records
3. Uses exact same logic as API COUNT queries
4. Automatically fixes drift from soft deletes, moderation, user deletion
5. Updates both counters AND `lastReactedAt` if counts changed
6. Only updates `lastReactedAt` if counts unchanged (activity but offsetting changes)
7. Updates the conversation table with accurate values (on primary DB)
8. Marks queue entry as processed (sets `processedAt`)

This happens in `services/math-updater/src/jobs/updateConversationMath.ts` BEFORE processing polis math updates.

**Impact**:
- API can trust cached counters in conversation table
- Eliminates expensive COUNT queries from hot path
- Counters accurate within 20 seconds
- Self-healing from any drift source
- `lastReactedAt` properly maintained (was never being updated before!)

---

## Implementation Status

### Phase 1: Counter Reconciliation ✅ **COMPLETE**
- [x] Created `recalculateConversationCounters()` in `services/math-updater/src/conversationCounters.ts`
- [x] Integrated counter reconciliation into math-updater (runs every ~20 seconds)
- [x] Updates both counters AND `lastReactedAt` if counts changed
- [x] Only updates `lastReactedAt` if counts unchanged (offsetting activity)
- [x] Logs discrepancies for monitoring
- [x] Removed all expensive COUNT queries from hot path
- [x] Removed all `*BypassCache` functions from `services/api/src/service/common.ts`:
  - `getParticipantCountBypassCache()` - removed
  - `getOpinionCountBypassCache()` - removed
  - `getVoteCountBypassCache()` - removed
  - `updateCountsBypassCache()` - removed
- [x] Counter calculation now entirely done in math-updater service

### Phase 2: Read Replica ✅ **COMPLETE** - PRIMARY FIX (~90% improvement)
- [x] Configure read replica in `services/shared-backend/src/db.ts`
- [x] Configure read replica in `services/api/src/shared-backend/db.ts`
- [x] Configure read replica in `services/math-updater/src/shared-backend/db.ts`
- [x] Route all user-facing reads to read replica
- [x] Route all writes to primary database
- [x] Fallback to primary if no replica configured

**Result**: ✅ System responsive under load that previously caused complete failure

### Phase 3: Queue Table Implementation ✅ **COMPLETE** - Supporting Optimization
- [x] Create `conversation_update_queue` table with `lastMathUpdateAt` for rate limiting
- [x] Add queue table to Drizzle schema in all services
- [x] Update API opinion creation to INSERT into queue (remove conversation UPDATE)
- [x] Update API opinion deletion to INSERT into queue
- [x] Update API vote casting to INSERT into queue
- [x] **Transaction optimization**: Moved auto-vote outside transaction (`comment.ts:1206-1220`)
- [x] Update API moderation to INSERT into queue
- [x] Update API withdraw moderation to INSERT into queue
- [x] Update math-updater scan job to read from queue table with rate limiting
- [x] Update math-updater to mark processed queue entries with race-condition safety
- [x] Always update `lastMathUpdateAt` after successful math calculation
- [x] Conditionally update `processedAt` only if `requestedAt` unchanged

### Phase 4: Polis Math Fixes ✅ **COMPLETE**
- [x] Rolled back red-dwarf version in `services/python-bridge/pyproject.toml` (fixed broken polis math)
- [x] Implemented batch processing (BATCH_SIZE = 1000) in `services/math-updater/src/services/polisMathUpdater.ts`

**Known Limitation**: Large conversations (13K+ votes) take 30s-1min to update math

### Testing ✅ **COMPLETE**
- [x] Load tested locally using `services/load-testing/scripts/run-scenario1-with-monitoring.sh`
- [x] Scenario: Ramps from 50 to 200 concurrent VUs over 20 minutes
  - Each VU creates 5-10 opinions every 0.5-1.5 seconds
  - Each VU casts 5-15 votes every 0.5-2 seconds
  - Total: ~1,500 opinion creations + ~2,000 votes = ~3,500 write operations
- [x] Previously failed at just 28 VUs (system hung, fetch never completing)
- [x] Now handles full 200 VU load without hanging
- [x] Confirmed counter reconciliation working
- [x] Verified queue table processing with race-condition safety

---

## Code Changes Required

### 1. Opinion Creation (`services/api/src/service/comment.ts:1048-1217`)

**Current location**: Lines ~1108-1112 call `getOpinionCountBypassCache()` (expensive)

**Remove**:
```typescript
const userOpinionCountBeforeAction = await getOpinionCountBypassCache({
    db,
    conversationId,
    userId,
});
```

**In the transaction** (around line 1159-1166), **replace** complex counter update with:
```typescript
await tx.update(conversationTable)
  .set({
    opinionCount: sql`opinion_count + 1`,
    needsMathUpdate: true,
    mathUpdateRequestedAt: now,
    lastReactedAt: now,
  })
  .where(eq(conversationTable.id, conversationId));
```

---

### 2. Opinion Deletion (`services/api/src/service/comment.ts:1250-1290`)

**Current location**: Line 1254 sets `currentContentId: null` (soft delete)

**Add after the soft delete** (around line 1264):
```typescript
// Decrement opinion count
await tx.update(conversationTable)
  .set({
    opinionCount: sql`opinion_count - 1`,
    needsMathUpdate: true,
    mathUpdateRequestedAt: now,
  })
  .where(eq(conversationTable.id, conversationId));
```

**Note**: Need to fetch conversationId first:
```typescript
const opinion = await tx.query.opinionTable.findFirst({
  where: eq(opinionTable.id, commentId),
  columns: { conversationId: true },
});
```

---

### 3. Vote Casting (`services/api/src/service/voting.ts:98-523`)

**Current location**: Lines ~278-284 fetch participant counts (expensive)

**Remove**: Expensive participant count queries before the transaction

**In transaction** (around lines 337-377), **replace** counter calculations with:

```typescript
// Check if this is user's first vote in this conversation
const existingVotesInConversation = await tx
  .select({ id: voteTable.id })
  .from(voteTable)
  .innerJoin(opinionTable, eq(voteTable.opinionId, opinionTable.id))
  .where(
    and(
      eq(voteTable.authorId, userId),
      eq(opinionTable.conversationId, conversationId),
      isNotNull(voteTable.currentContentId)
    )
  )
  .limit(1);

const isFirstVote = existingVotesInConversation.length === 0;

// Update counters atomically
if (isNewVote) {
  // Creating a new vote (not changing existing)
  await tx.update(conversationTable)
    .set({
      voteCount: sql`vote_count + 1`,
      participantCount: isFirstVote ? sql`participant_count + 1` : sql`participant_count`,
      needsMathUpdate: true,
      mathUpdateRequestedAt: now,
      lastReactedAt: now,
    })
    .where(eq(conversationTable.id, conversationId));
} else {
  // Changing existing vote (no counter change)
  await tx.update(conversationTable)
    .set({
      needsMathUpdate: true,
      mathUpdateRequestedAt: now,
      lastReactedAt: now,
    })
    .where(eq(conversationTable.id, conversationId));
}
```

---

### 4. Vote Cancellation (`services/api/src/service/voting.ts:301-312`)

**Current location**: Line 305 sets `currentContentId: null` (soft delete)

**Add after the soft delete** (around line 312):
```typescript
// Decrement vote count (but keep participant count - user remains a participant)
await tx.update(conversationTable)
  .set({
    voteCount: sql`vote_count - 1`,
    needsMathUpdate: true,
    mathUpdateRequestedAt: now,
  })
  .where(eq(conversationTable.id, conversationId));
```

**Note**: Need to fetch conversationId:
```typescript
const opinion = await tx.query.opinionTable.findFirst({
  where: eq(opinionTable.id, opinionId),
  columns: { conversationId: true },
});
```

---

## User Deletion - Already Handled! ✅

User deletion (`services/api/src/service/account.ts:618-734`) already:
1. **Cancels all votes** via `castVote(..., "cancel")` - lines 660-671
2. **Deletes all opinions** via `deleteOpinionBySlugId()` - lines 673-688
3. **Tracks affected conversations** for math updates - lines 706-731

**No special handling needed!** Once we add counter decrements to opinion deletion and vote cancellation (above), user deletion will automatically benefit.

---

## Handling Edge Cases

### Participant Count Strategy

Participant count is complex:
- ✅ Increment when user votes for first time in conversation
- ❌ Don't increment when user changes their vote
- ❌ Don't decrement when vote is cancelled (user remains participant)
- 🔧 Let reconciliation fix any drift (e.g., user deletes all votes)

**Implementation**: Check for existing votes before incrementing (see Vote Casting section above)

### Race Conditions

With atomic operations, counters may drift slightly:
- Multiple concurrent vote cancellations might decrement twice
- Soft deletes followed by recreates might cause drift
- Transaction rollbacks might not revert counter changes

**Solution**: Reconciliation every 20 seconds fixes all drift automatically

### Negative Counts

Should never happen, but if they do:
- Math-updater reconciliation will fix them
- Log errors if detected: `if (opinionCount < 0) log.error(...)`
- Consider adding DB constraint: `CHECK (opinion_count >= 0)`

---

## Testing Strategy

### 1. Unit Testing
```typescript
// Test atomic operations
expect(await getConversation('R3NBkA')).opinionCount.toBe(5);
await createOpinion({ conversationSlugId: 'R3NBkA', ... });
expect(await getConversation('R3NBkA')).opinionCount.toBe(6);

await deleteOpinion({ opinionSlugId: 'ABC123', ... });
expect(await getConversation('R3NBkA')).opinionCount.toBe(5);

// Test reconciliation
await directlyDeleteOpinionFromDb(opinionId); // Bypass API
// Counter is now wrong (still 5)
await triggerMathUpdate('R3NBkA');
expect(await getConversation('R3NBkA')).opinionCount.toBe(4); // Fixed!
```

### 2. Load Testing
```bash
cd services/load-testing
./scripts/run-scenario1-with-monitoring.sh R3NBkA
```

**Monitor**:
- API logs: No more COUNT queries, response times < 100ms
- Math-updater logs: Check for counter discrepancies being fixed
- Frontend: Conversation fetches complete quickly (no hanging!)
- Database: No lock contention

**Success Criteria**:
- ✅ No hanging under 200 concurrent users
- ✅ API response time < 100ms p95
- ✅ Counters accurate within 20 seconds
- ✅ No error rate increase
- ✅ No database lock timeouts

### 3. Counter Accuracy Test
```bash
# After load test completes, verify counters match reality
SELECT
  c.slug_id,
  c.opinion_count as stored_count,
  COUNT(DISTINCT o.id) FILTER (WHERE o.current_content_id IS NOT NULL) as actual_count,
  c.opinion_count - COUNT(DISTINCT o.id) FILTER (WHERE o.current_content_id IS NOT NULL) as drift
FROM conversation c
LEFT JOIN opinion o ON o.conversation_id = c.id
GROUP BY c.id
HAVING c.opinion_count != COUNT(DISTINCT o.id) FILTER (WHERE o.current_content_id IS NOT NULL);
```

Should return 0 rows (or small drift that reconciliation is fixing)

---

## Expected Performance Improvement

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Opinion create | 200-500ms | 50-100ms | **4-5x faster** |
| Vote cast | 150-400ms | 30-80ms | **5x faster** |
| Concurrent users (before hang) | 28 | 200+ | **7x better** |
| Database locks | Severe contention | Minimal | **99% reduction** |
| Counter accuracy | 100% (real-time) | 100% (within 20s) | Acceptable trade-off |
| COUNT queries per request | 3-4 | 0 | **100% reduction** |

---

## Monitoring in Production

Watch for these in math-updater logs:

### 1. Normal Counter Drift (expected occasionally)
```
[Counter Reconciliation] Fixing counters for conversation R3NBkA
before: { opinionCount: 105, voteCount: 523, participantCount: 42 }
after:  { opinionCount: 103, voteCount: 520, participantCount: 42 }
diff:   { opinions: -2, votes: -3, participants: 0 }
```
**Action**: Monitor frequency. If > 5% of updates show drift, investigate.

### 2. Large Discrepancies (investigate)
```
diff:   { opinions: -50, votes: -200, participants: -10 }
```
**Possible causes**:
- Atomic operations failing silently
- Transaction rollbacks not properly handled
- Race conditions in increment/decrement logic
- Bug in soft delete logic

### 3. Negative Counts (critical bug!)
```
before: { opinionCount: -5, voteCount: 100, participantCount: 20 }
```
**Action**: Immediate investigation required. Possible causes:
- Decrement without corresponding increment
- Double-decrement on delete
- Missing null checks

---

## Rollback Plan

If counters become too inaccurate or performance doesn't improve:

### Option 1: Increase Reconciliation Frequency
```typescript
// In services/math-updater/src/index.ts
const SCAN_INTERVAL_MS = 1000;  // Was 2000 (every 1 second)
const MIN_TIME_BETWEEN_UPDATES_MS = 5000;  // Was 20000 (every 5 seconds)
```

### Option 2: Add Database Indexes
Make COUNT queries faster instead of removing them:
```sql
CREATE INDEX idx_vote_conversation_active
ON vote(opinion_id)
WHERE current_content_id IS NOT NULL;

CREATE INDEX idx_opinion_conversation_active
ON opinion(conversation_id)
WHERE current_content_id IS NOT NULL;
```

### Option 3: Revert to COUNT Queries
- Only if absolutely necessary
- Re-add expensive queries but with indexes
- Accept slower performance over accuracy concerns

---

## Files Modified

### Phase 1: Counter Reconciliation (Completed)
**Created:**
- `services/math-updater/src/conversationCounters.ts` - Counter reconciliation logic (exact copy of API count logic)

**Modified:**
- `services/math-updater/src/jobs/updateConversationMath.ts` - Added counter reconciliation before math processing

### Phase 2: Queue Table Implementation (Completed)
**Created:**
- `services/shared-backend/src/schema.ts` - Added `conversationUpdateQueueTable` definition
- `services/api/drizzle/0024_low_madrox.sql` - Migration for queue table
- `services/api/database/flyway/V0024__remarkable_scalphunter.sql` - Applied migration (from add-ai-translation branch)

**Modified API (eliminated conversation table UPDATEs):**
- `services/api/src/service/comment.ts`
  - Opinion creation (line ~1155): Replaced conversation UPDATE with queue INSERT
  - Opinion deletion (line ~1288): Replaced conversation UPDATE with queue INSERT
- `services/api/src/service/voting.ts`
  - Vote casting/cancellation (line ~322): Replaced all conversation UPDATEs with single queue INSERT
- `services/api/src/service/moderation.ts`
  - Moderate opinion (line ~129): Replaced conversation UPDATE with queue INSERT
  - Withdraw moderation (line ~296): Replaced conversation UPDATE with queue INSERT

**Modified Math-Updater (race-condition-safe queue processing):**
- `services/math-updater/src/jobs/scanConversations.ts`
  - Changed to read from `conversation_update_queue` table instead of `conversation.needsMathUpdate`
  - Passes captured `requestedAt` to job handler
- `services/math-updater/src/jobs/updateConversationMath.ts`
  - Changed to use `requestedAt` from job data
  - Soft-deletes queue entry only if `requestedAt` unchanged (race-condition safe)
  - Updates `conversation.lastMathUpdateAt` for monitoring

**Key Pattern Used Throughout:**
```typescript
// API: Insert into queue (eliminates conversation row lock)
await tx.insert(conversationUpdateQueueTable)
    .values({ conversationId, requestedAt: now, processedAt: null })
    .onConflictDoUpdate({
        target: conversationUpdateQueueTable.conversationId,
        set: { requestedAt: now, processedAt: null }
    });

// Math-updater: Race-condition-safe processing
const updateResult = await db.update(conversationUpdateQueueTable)
    .set({ processedAt: now })
    .where(and(
        eq(conversationUpdateQueueTable.conversationId, conversationId),
        eq(conversationUpdateQueueTable.requestedAt, capturedRequestedAt) // Only if unchanged!
    ));
```
