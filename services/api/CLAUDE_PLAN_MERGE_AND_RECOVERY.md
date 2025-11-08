# Implementation Plan: Multi-Ticket + Merge + 15-Day Deletion Recovery

## Overview

This plan addresses four interconnected features:
1. **Allow multiple tickets per user** for the same event (Zupass)
2. **Merge guest accounts into verified accounts** when users authenticate with multiple methods (all 3 auth methods)
3. **15-day account deletion recovery** period with proper device logout (security-safe)
4. **Fix duplicate device insert bug** (already completed in previous session)

---

## Implementation Status

### ✅ Completed
- Part 1: All schema changes (deletedAt, merge, restore_deleted)
- Part 2.1-2.2: Account deletion with deletedAt and logoutAllDevicesForUser
- Part 2.3-2.5: getDeviceStatus with recovery window detection
- Part 2.6: Recovery checks in all auth methods (Zupass, Phone, Rarimo)
- Part 2.7: restore_deleted switch cases in all auth methods
- Part 2.8: restoreDeletedUser function implemented
- Part 3: Removed one-ticket-per-user restriction in Zupass
- Part 4.1: Updated all auth methods to return "merge" type with discriminated unions
- Part 4.2: Type safety improvements (phoneUserId/nullifierUserId/deviceUserId naming)
- Part 4.3: Merge switch cases in all auth methods (Zupass, Phone, Rarimo)
- Part 4.4: mergeGuestIntoVerifiedUser function implemented
- DeviceLoginStatusExtended updated with isRecoverableDeleted flag

### ⚠️ Remaining
- Part 5: Database migration generation (sync + generate + migrate)
- Part 6-7: Frontend changes (if needed)

---

## Current Implementation Details

### Parameter Passing Pattern (IMPLEMENTED)

**Consistent approach across all auth functions:**

```typescript
// Entry point generates now once
const now = nowZeroMs();
const deviceStatus = await getDeviceStatus(db, didWrite, now);

// Pass full deviceStatus object to auth type functions
const authResult = await getZupassAuthenticationType({
    db,
    nullifier,
    didWrite,
    eventSlug,
    deviceStatus,  // Full object, contains isRecoverableDeleted
});

// Auth function checks recovery internally
if (deviceStatus.isKnown && deviceStatus.isRecoverableDeleted) {
    return { type: "restore_deleted", userId: deviceStatus.userId };
}
```

**Rationale:**
- Type-safe: deviceStatus is strongly typed
- Encapsulated: All device state in one object
- Consistent: Same pattern for Phone/Zupass/Rarimo
- Avoids duplication: Recovery state calculated once

---

## Recovery Flow (CLARIFICATION)

**Users MUST verify credentials BEFORE account restoration:**

1. User attempts authentication (Phone OTP / Rarimo proof / Zupass GPC)
2. Credentials verified FIRST (proves identity)
3. `getDeviceStatus` called to check if user is in recovery window
4. If `isRecoverableDeleted === true`, return `restore_deleted` type
5. Execute restoration: restore user + add credential + login device

**This is correct and secure:** Users prove ownership before restoration.

---

## Known Issues

### 🐛 Issue 1: TypeScript Error in Phone Auth
**File:** `services/api/src/service/auth.ts:318`
**Problem:** Passing `now` parameter to `getPhoneAuthenticationTypeByHash` but interface doesn't accept it
**Fix:** Remove `now` parameter from call (line 318) - deviceStatus already contains recovery state

```typescript
// CURRENT (line 313-318):
const { type, userId } = await getPhoneAuthenticationTypeByHash({
    db,
    phoneHash: resultOtp[0].phoneHash,
    didWrite,
    deviceStatus,
    now,  // ❌ REMOVE THIS - not in interface
});

// FIXED:
const { type, userId } = await getPhoneAuthenticationTypeByHash({
    db,
    phoneHash: resultOtp[0].phoneHash,
    didWrite,
    deviceStatus,  // ✅ This contains isRecoverableDeleted
});
```

**Also fix line 943 in same pattern.**

---

## Part 1: Schema Changes ✅ COMPLETED

### 1.1 Add `deletedAt` timestamp to `user` table ✅

**Status:** COMPLETED - Line 594 in `services/shared-backend/src/schema.ts`

```typescript
deletedAt: timestamp("deleted_at", { mode: "date", precision: 0 }), // Track when deletion occurred for 15-day recovery
```

### 1.2 Add "merge" and "restore_deleted" authentication types ✅

**Status:** COMPLETED

**Locations:**
- `services/shared-backend/src/schema.ts:988` - pgEnum includes "merge" and "restore_deleted"
- `services/api/src/service/auth.ts:103` - AuthTypeAndUserId discriminated union
- `services/api/src/service/zupass.ts:515` - ZupassAuthResult discriminated union

### 1.3 Replace AuthTypeAndUserId with discriminated union ✅

**Status:** COMPLETED

```typescript
type AuthTypeAndUserId =
    | { type: "register" | "login_known_device" | "login_new_device"; userId: string }
    | { type: "merge"; userId: string; guestUserId: string }
    | { type: "associated_with_another_user"; userId: string }
    | { type: "restore_deleted"; userId: string };
```

---

## Part 2: Account Deletion & Recovery

### 2.1-2.2 Account Deletion Infrastructure ✅ COMPLETED

**Files:**
- `services/api/src/service/account.ts:638` - Sets deletedAt
- `services/api/src/service/account.ts:702` - Calls logoutAllDevicesForUser
- `services/api/src/service/auth.ts:1402-1414` - logoutAllDevicesForUser implementation

### 2.3-2.5 getDeviceStatus Updates ✅ COMPLETED

**File:** `services/api/src/service/authUtil.ts:158-215`

**Implementation:**
- Accepts `now` parameter (line 161)
- Queries `deletedAt` and `eventTicketId` (lines 170-171)
- Calculates `isRecoverableDeleted` based on 15-day window (lines 196-199)
- Returns proper status for deleted users:
  - Within 15 days: `isKnown: true, isRecoverableDeleted: true`
  - After 15 days: `isKnown: false`
- Includes eventTickets in `isRegistered` check (line 193)

**Type:**
- `DeviceLoginStatusExtended` in `services/shared/src/types/zod.ts:883-886`
- Has required `isRecoverableDeleted` field when `isKnown: true`

### 2.6 Recovery Checks in Authentication Functions

#### A) Zupass ✅ COMPLETED

**File:** `services/api/src/service/zupass.ts:718-722`

```typescript
if (deviceStatus.isKnown && deviceStatus.isRecoverableDeleted) {
    return {
        type: "restore_deleted",
        userId: deviceStatus.userId,
    };
}
```

#### B) Phone ✅ COMPLETED

**File:** `services/api/src/service/auth.ts:890-894`

```typescript
if (deviceStatus.isKnown && deviceStatus.isRecoverableDeleted) {
    return {
        type: "restore_deleted",
        userId: deviceStatus.userId,
    };
}
```

#### C) Rarimo ❌ NOT IMPLEMENTED

**File:** `services/api/src/service/auth.ts` (around line 951)

**TODO:** Add recovery check at beginning of `getZKPAuthenticationType`:

1. Update interface to accept `deviceStatus`:
```typescript
interface GetZKPAuthenticationType {
    db: PostgresDatabase;
    nullifier: string;
    didWrite: string;
    deviceStatus: DeviceLoginStatusExtended; // NEW
}
```

2. Add check at function start:
```typescript
export async function getZKPAuthenticationType({
    db,
    nullifier,
    didWrite,
    deviceStatus, // NEW
}: GetZKPAuthenticationType): Promise<AuthTypeAndUserId> {
    // NEW: Check for recovery
    if (deviceStatus.isKnown && deviceStatus.isRecoverableDeleted) {
        return {
            type: "restore_deleted",
            userId: deviceStatus.userId,
        };
    }

    // ... existing logic
}
```

3. Update call sites to pass deviceStatus (similar to Phone pattern)

### 2.7 Handle "restore_deleted" in Execution ❌ NOT IMPLEMENTED

**Need to add `case "restore_deleted"` to 3 switch statements:**

#### A) Zupass: `verifyEventTicket()`

**File:** `services/api/src/service/zupass.ts` (find switch statement)

```typescript
case "restore_deleted":
    // Restore user
    await restoreDeletedUser({ db: tx, userId: authResult.userId });

    // Add the ticket they're verifying
    await tx.insert(eventTicketTable).values({
        userId: authResult.userId,
        provider: "zupass",
        nullifier,
        eventSlug,
        pcdType: "gpc",
        providerMetadata: null,
    });

    // Login device (sessionExpiry already defined in function)
    await tx.update(deviceTable)
        .set({ sessionExpiry: sessionExpiry, updatedAt: now })
        .where(eq(deviceTable.didWrite, didWrite));

    log.info({ userId: authResult.userId, nullifier, eventSlug },
        "[Zupass] Restored deleted user, added ticket, and logged in device");
    break;
```

#### B) Phone: `authenticateCode()`

**File:** `services/api/src/service/auth.ts` (find switch statement, around line 212)

```typescript
case "restore_deleted": {
    // Restore user
    await restoreDeletedUser({ db, userId });

    // Login device (loginSessionExpiry already defined in function)
    await db.update(deviceTable)
        .set({ sessionExpiry: loginSessionExpiry, updatedAt: nowZeroMs() })
        .where(eq(deviceTable.didWrite, didWrite));

    return { success: true };
}
```

#### C) Rarimo: `verifyRarimo()`

**File:** `services/api/src/service/rarimo.ts` (find switch statement)

```typescript
case "restore_deleted":
    // Restore user
    await restoreDeletedUser({ db, userId });

    // Login device (loginSessionExpiry already defined in function)
    await db.update(deviceTable)
        .set({ sessionExpiry: loginSessionExpiry, updatedAt: nowZeroMs() })
        .where(eq(deviceTable.didWrite, didWrite));

    return { success: true, rarimoStatus };
```

### 2.8 Create `restoreDeletedUser()` Function ❌ NOT IMPLEMENTED

**File:** `services/api/src/service/auth.ts` (add after `logoutAllDevicesForUser`)

```typescript
interface RestoreDeletedUserProps {
    db: PostgresDatabase;
    userId: string;
}

/**
 * Restore a soft-deleted user within 15-day recovery window
 * - Sets isDeleted = false, deletedAt = null
 * - Does NOT touch device sessions (auth flow handles device login)
 *
 * IMPORTANT: Must be called AFTER credential verification (Phone OTP/Rarimo proof/Zupass GPC)
 * Users prove identity first, then account is restored.
 */
export async function restoreDeletedUser({
    db,
    userId,
}: RestoreDeletedUserProps): Promise<void> {
    const now = nowZeroMs();

    await db
        .update(userTable)
        .set({
            isDeleted: false,
            deletedAt: null,
            updatedAt: now,
        })
        .where(eq(userTable.id, userId));

    log.info({ userId }, "Restored deleted user account");
}
```

**Note:** Device login is handled in the switch case, NOT in this function. This keeps restoration separate from session management.

---

## Part 3: Remove One-Ticket-Per-User Restriction ❌ NOT IMPLEMENTED

### 3.1 Remove ticket restriction in Zupass authentication

**File:** `services/api/src/service/zupass.ts`

**Search for and delete:**
1. Any `didUserHasTicket` variable or check
2. Any `hasUserTicketForEvent` call
3. Any rejection logic based on existing ticket

**Rationale:** Schema allows multiple tickets per user per event (no unique constraint). This enables users to verify multiple tickets for the same event.

---

## Part 4: Implement Guest-to-Verified User Merge ❌ NOT IMPLEMENTED

### 4.1 Update Authentication Logic to Return "merge" Type

**Pattern:** Change "not_associated" cases to return merge instead of reject

#### A) Zupass: `getZupassAuthenticationType()`

**File:** `services/api/src/service/zupass.ts`

Find the "not_associated" case where nullifier is owned by guest. Update logic to:

```typescript
} else {
    // Nullifier owned by guest user
    const isDidUserVerified = deviceStatus.isKnown && deviceStatus.isRegistered;
    if (isDidUserVerified) {
        return {
            type: "merge",
            userId: userId,  // verified user (current device owner)
            guestUserId: nullifierUserId,  // guest (nullifier owner)
        };
    } else {
        return {
            type: "merge",
            userId: nullifierUserId,  // guest becomes primary
            guestUserId: userId,  // current user merged into guest
        };
    }
}
```

#### B) Phone: `getPhoneAuthenticationTypeByHash()`

**File:** `services/api/src/service/auth.ts`

Find "not_associated" case and replace with:

```typescript
case "not_associated": {
    // Device exists but not associated with this phone
    // Merge guest (device owner) into new phone user
    const deviceUserId = await getDeviceUserId(db, didWrite);
    return {
        type: "merge",
        userId: userId,  // phone user (new verified)
        guestUserId: deviceUserId,  // device owner (guest)
    };
}
```

#### C) Rarimo: `getZKPAuthenticationType()`

**File:** `services/api/src/service/auth.ts`

Same pattern as Phone:

```typescript
case "not_associated": {
    // Device exists but not associated with this Rarimo nullifier
    const deviceUserId = await getDeviceUserId(db, didWrite);
    return {
        type: "merge",
        userId: userId,  // Rarimo user (new verified)
        guestUserId: deviceUserId,  // device owner (guest)
    };
}
```

### 4.2 Create `getDeviceUserId()` Helper Function

**File:** `services/api/src/service/auth.ts`

```typescript
/**
 * Get the userId associated with a device
 * Used for merge scenarios to identify the guest user
 */
export async function getDeviceUserId(
    db: PostgresDatabase,
    didWrite: string,
): Promise<string> {
    const result = await db
        .select({ userId: deviceTable.userId })
        .from(deviceTable)
        .where(eq(deviceTable.didWrite, didWrite));

    if (result.length === 0) {
        throw new Error(`Device not found: ${didWrite}`);
    }

    return result[0].userId;
}
```

### 4.3 Handle "merge" in Execution Flow

Add `case "merge"` to all 3 switch statements. Each case should:
1. Call `mergeGuestIntoVerifiedUser()`
2. Return success with `accountMerged: true` flag

#### A) Zupass

```typescript
case "merge":
    await mergeGuestIntoVerifiedUser({
        db: tx,
        verifiedUserId: authResult.userId,
        guestUserId: authResult.guestUserId,
    });
    log.info({ verifiedUserId: authResult.userId, guestUserId: authResult.guestUserId },
        "[Zupass] Merged guest into verified user");
    break;

// After transaction, update return:
return {
    success: true,
    accountMerged: authResult.type === "merge",
};
```

#### B) Phone

```typescript
case "merge": {
    await mergeGuestIntoVerifiedUser({
        db,
        verifiedUserId: userId,
        guestUserId: (authResult as Extract<AuthTypeAndUserId, { type: "merge" }>).guestUserId,
    });
    return { success: true, accountMerged: true };
}
```

#### C) Rarimo

```typescript
case "merge":
    await mergeGuestIntoVerifiedUser({
        db,
        verifiedUserId: userId,
        guestUserId: (authResult as Extract<AuthTypeAndUserId, { type: "merge" }>).guestUserId,
    });
    return { success: true, rarimoStatus, accountMerged: true };
```

### 4.4 Implement `mergeGuestIntoVerifiedUser()` Function

**File:** Create new `services/api/src/service/merge.ts`

See original plan lines 1024-1214 for full implementation. Key strategy:
- Transfer votes (skip conflicts, keep verified user's votes)
- Transfer poll_responses (skip conflicts)
- Transfer all other data (devices, tickets, opinions, conversations, etc.)
- Soft-delete guest user

---

## Part 5: Database Migration

### 5.1 Generate Migration

```bash
cd services/shared-backend
pnpm run sync  # Sync schema changes

cd ../api
pnpm db:generate  # Generate migration
```

### 5.2 Review Migration

Should contain:
1. `ALTER TABLE "user" ADD COLUMN "deleted_at" timestamp(0);`
2. `ALTER TYPE "auth_type" ADD VALUE 'merge';`
3. `ALTER TYPE "auth_type" ADD VALUE 'restore_deleted';`

### 5.3 Apply Migration

```bash
cd services/api
pnpm db:migrate
```

---

## Testing Checklist

### Account Deletion & Recovery
- [ ] Delete account → sets deletedAt, logs out all devices
- [ ] Login within 15 days with Phone → account restored
- [ ] Login within 15 days with Rarimo → account restored
- [ ] Login within 15 days with Zupass → account restored
- [ ] Login after 15 days → treated as unknown (can't recover)
- [ ] Guest user deletes account → can't recover (no way to verify identity)
- [ ] Device gets proper session after restoration

### Multi-Ticket Support
- [ ] Verify multiple tickets for same event → all stored
- [ ] No rejection for duplicate event tickets

### Guest Merge
- [ ] Verified user claims guest's Zupass ticket → merge
- [ ] Guest verifies phone → merge into phone user
- [ ] Guest verifies Rarimo → merge into Rarimo user
- [ ] Conflicting votes/poll responses → verified user's kept
- [ ] All guest content transferred correctly
- [ ] Guest user soft-deleted after merge

---

## Next Steps Priority

1. **Fix TypeScript error** (5 min) - Remove `now` parameter from getPhoneAuthenticationTypeByHash calls
2. **Add Rarimo recovery check** (15 min)
3. **Implement restoreDeletedUser()** (20 min)
4. **Add restore_deleted switch cases** (45 min)
5. **Remove multi-ticket restriction** (15 min)
6. **Implement merge logic** (4-6 hours)
7. **Generate database migration** (10 min)
8. **Test all flows** (2-3 hours)

---

## Architecture Notes

### Recovery Flow Security
✅ **Correct approach:** Users MUST verify credentials (Phone/Rarimo/Zupass) BEFORE restoration
- Prevents unauthorized account recovery
- Proves identity ownership
- Follows standard security practices

### Parameter Passing Pattern
✅ **Using full `deviceStatus` object:**
- Type-safe and maintainable
- Avoids parameter duplication
- Consistent across all auth methods
- Recovery state calculated once in `getDeviceStatus`

### Merge Direction Logic
✅ **Always merge INTO verified user:**
- Verified user = has Phone OR Rarimo OR Zupass ticket
- Guest user = no verification method
- Direction determined by `deviceStatus.isRegistered`
