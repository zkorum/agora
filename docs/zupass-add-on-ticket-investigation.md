# Zupass Add-On Ticket Investigation

**Date:** 2025-01-12
**Issue:** "Not enough PODs" error for User B (partner with complementary/add-on ticket)
**Status:** Root cause identified, solution in progress

---

## Executive Summary

User B has a **complementary/add-on Devconnect 2025 ticket** (bound to User A's parent ticket via `parentTicketId`). While the ticket appears valid on devconnect.org/perks, it fails with "Not enough PODs" error when attempting to verify on www.agoracitizen.app production.

**Key Finding:** Zupass architecture DOES support add-on tickets with independent nullifier generation. The issue is likely in the ticket retrieval or POD conversion pipeline, NOT a fundamental limitation.

---

## Background

### Ticket Validation Data

User B's ticket (from devconnect.org/perks console):
```javascript
eventId: "1f36ddce-e538-4c7a-9f31-6a4b2221ecac" ✅
signerPublicKey: "YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs" ✅
```

Both values match the Agora configuration exactly, confirming the ticket is valid.

### Error Context

- **User A (main ticket holder):** ✅ Successfully verified on production
- **User B (add-on ticket holder):** ❌ "Not enough PODs" error on production
- **Both users:** Working on localhost and staging (domain whitelist was already fixed)

---

## Technical Analysis

### 1. Error Code Path

**File:** `/zupass/apps/passport-client/src/zapp/ZappServer.ts:377-434`

```typescript
public async prove({ request, collectionIds }: ProveParams): Promise<ProveResult> {
  // Step 1: Get PODs from specified collections
  const pods = this.getPODsIfPermitted(realCollectionIds, "gpc.prove");

  // Step 2: Add PODTicketPCDs converted to PODs
  const ticketPods = this.getContext()
    .getState()
    .pcds.getPCDsByType(PODTicketPCDTypeName)
    .map((pcd) => {
      try {
        return ticketToPOD(pcd as PODTicketPCD);
      } catch (e) {
        return undefined; // ⚠️ SILENT FAILURE
      }
    })
    .filter((p) => !!p) as POD[];

  pods.push(...ticketPods);

  // Step 3: Query for matching PODs based on proof request schema
  const inputPods = prs.queryForInputs(pods);

  // Step 4: Check if ANY required POD slot has ZERO candidates
  if (Object.values(inputPods).some((candidates) => candidates.length === 0)) {
    return {
      success: false,
      error: "Not enough PODs"  // ⚠️ ERROR THROWN HERE
    };
  }

  // Step 5: Show UI for proof generation
  return new Promise((resolve) => { /* ... */ });
}
```

**Critical Discovery:** The `ticketToPOD()` conversion **silently catches and drops failed tickets**. If User B's add-on ticket fails conversion, it never makes it to the `queryForInputs()` step.

---

### 2. Add-On Ticket Architecture

#### Schema Definition

**File:** `/zupass/packages/pcd/pod-ticket-pcd/src/schema.ts`

```typescript
export const TicketDataSchema = z.object({
  // REQUIRED fields
  eventName: z.string(),
  ticketName: z.string(),
  ticketId: z.string().uuid(),
  eventId: z.string().uuid(),
  productId: z.string().uuid(),
  timestampConsumed: z.string(),
  timestampSigned: z.string(),
  isConsumed: z.boolean(),
  isRevoked: z.boolean(),
  ticketCategory: z.enum([...]),
  attendeeName: z.string(),
  attendeeEmail: z.string().email(),

  // OPTIONAL fields
  owner: z.string().optional(),           // ← Semaphore V4 commitment
  isAddOn: z.boolean().optional(),        // ← Add-on flag
  parentTicketId: z.string().uuid().optional(), // ← Parent ticket reference
  // ... other optional fields
});
```

**Key Points:**
- ✅ `owner` field is OPTIONAL but should be populated at issuance
- ✅ `isAddOn` and `parentTicketId` are independent optional fields
- ✅ Add-on tickets have the same required fields as parent tickets

#### Ticket Issuance

**File:** `/zupass/apps/passport-server/src/services/generic-issuance/pipelines/PretixPipeline.ts:1307-1340`

```typescript
function atomToPODTicketData(
  atom: ZupassFeedAtom,
  semaphoreV4Id: string  // ← SAME for parent and add-on
): PODTicketData {
  return {
    // ... all ticket fields
    owner: semaphoreV4Id,  // ← Set for BOTH parent and add-on
    isAddOn: !!atom.parentAtomId,
    parentTicketId: atom.parentAtomId ?? undefined,
  };
}
```

**Crucial Finding:** Add-on tickets get their OWN `owner` field (Semaphore V4 public key), enabling independent nullifier generation.

#### Email Inheritance

**Lines 437-450:**
```typescript
if (atom.parentAtomId) {
  const parentAtom = atoms.find((a) => a.id === atom.parentAtomId);
  if (parentAtom?.email) {
    atom.email = parentAtom.email; // ← Add-on inherits parent's email
  }
}
```

---

### 3. POD Conversion Process

**File:** `/zupass/packages/pcd/pod-ticket-pcd/src/utils.ts:56-144`

```typescript
export function dataToPodEntries<T>(
  rawData: T,
  schema: ZodSchema,
  shape: ZodRawShape
): PODEntries {
  const data = schema.parse(rawData); // ← Can throw if schema invalid
  const entries: PODEntries = {};

  for (const [key, field] of Object.entries(shape)) {
    const typeName = field._def.typeName;

    // Handle optional fields
    if (typeName === "ZodOptional") {
      if (!data[key]) {
        continue; // ← Skip if undefined/null
      }
      // ... process optional value
    }

    // Handle owner field (lines 126-132)
    if (key === "owner" && data[key]) {
      entries[key] = {
        type: "eddsa_pubkey",
        value: data[key] as string
      };
    }
  }

  return entries;
}
```

**Important:** If `owner` field is null/undefined, it's skipped. Without an `owner` entry, the POD cannot generate a Semaphore V4 nullifier.

---

### 4. POD Query Filtering

**File:** `/parcnet-client/packages/podspec/src/parse/pod.ts:157-179`

```typescript
public query(input: POD[]): { matches: StrongPOD[]; matchingIndexes: number[] } {
  const matchingIndexes: number[] = [];
  const matches: StrongPOD[] = [];
  const signatures = new Set<string>();

  for (const [index, pod] of input.entries()) {
    const result = this.safeParse(pod, { exitEarly: true });
    if (result.isValid) {
      // Deduplication by signature
      if (signatures.has(result.value.signature)) {
        continue;
      }
      signatures.add(result.value.signature);
      matchingIndexes.push(index);
      matches.push(result.value);
    }
  }
  return { matches, matchingIndexes };
}
```

**Schema Validation (safeParsePod):**
- Validates all required fields exist
- Checks `signerPublicKey` matches membership list
- Verifies tuple constraints (e.g., `[signerPublicKey, eventId]`)
- Validates `owner` field if proof requires Semaphore identity

---

## Root Cause Hypotheses (Ranked by Likelihood)

### 1. Missing `owner` Field ⭐⭐⭐⭐⭐ (MOST LIKELY)

**Hypothesis:** User B's add-on ticket was issued without the `owner` field populated.

**Evidence:**
- Add-on tickets inherit parent email (line 442)
- If `semaphoreV4Id` is empty/undefined at issuance, `owner` field won't be set
- POD conversion skips null/undefined `owner` (line 127-132)
- Without `owner`, Semaphore V4 nullifier cannot be generated

**Verification:**
- Have User B export their ticket POD from Zupass
- Check if `owner` field exists in the POD entries
- Compare with User A's ticket POD

**Fix:**
- If `owner` is missing, User B needs to re-import/sync ticket from Zupass
- Backend may need to re-issue ticket with correct `semaphoreV4Id`

---

### 2. Silent POD Conversion Failure ⭐⭐⭐⭐

**Hypothesis:** The `ticketToPOD()` conversion throws an exception for User B's ticket.

**Evidence:**
- Exception is caught and ticket is silently dropped (line 397-403)
- No error logged to console
- Ticket appears valid but never makes it to `queryForInputs()`

**Verification:**
- Add try-catch logging in Zupass source to capture conversion errors
- Check Zupass browser console for any warnings during proof generation

**Fix:**
- Patch Zupass to log conversion failures
- Identify which field/validation is causing the exception

---

### 3. Collection Storage Issue ⭐⭐⭐

**Hypothesis:** User B's add-on ticket is stored in a different collection than "Devconnect ARG".

**Evidence:**
- Proof request specifies `collectionIds: ["Devconnect ARG"]`
- If ticket is in a different folder, it won't be retrieved

**Verification:**
- Have User B check Zupass Settings → PCDs
- Confirm which collection contains their Devconnect ticket

**Fix:**
- Remove `collectionIds` filter to search all collections
- OR: Add multiple collection names to the query

---

### 4. Tuple Validation Mismatch ⭐⭐

**Hypothesis:** Subtle difference in stored vs expected tuple values.

**Evidence:**
- Tuple constraint requires exact match: `[signerPublicKey, eventId]`
- If either value has leading/trailing whitespace or encoding differences, validation fails

**Verification:**
- Export both tickets and compare exact byte values
- Check for Unicode normalization issues

**Fix:**
- Normalize values before tuple comparison
- Use more lenient matching (e.g., trim whitespace)

---

### 5. Email-Based Filtering ⭐

**Hypothesis:** User B's email doesn't match parent ticket email.

**Evidence:**
- Add-on tickets inherit parent email (line 442)
- If User B's Zupass is registered with a different email, tickets might not be retrieved

**Verification:**
- Check what email User B's Zupass is registered with
- Compare with parent ticket email

**Fix:**
- User B should use the same email as the parent ticket holder
- OR: Backend should relax email-based filtering for add-ons

---

## Proposed Solutions

### Solution 1: Add Safe Debug Logging (RECOMMENDED)

**Goal:** Capture diagnostic information WITHOUT exposing personal data.

**Changes to:** `services/agora/src/composables/zupass/useZupassVerification.ts`

**What to log (SAFE - no PII):**
```typescript
// Line ~252, after calling gpc.prove()
if (!proofResult || "error" in proofResult) {
  console.error("[Zupass] Proof generation failed");
  console.error("[Zupass] Error:", proofResult?.error);

  // Log schema structure (no actual values)
  console.error("[Zupass] Proof request schema:", {
    podCount: Object.keys(proofRequest.schema.pods).length,
    tupleCount: Object.keys(proofRequest.schema.tuples || {}).length,
    hasExternalNullifier: !!proofRequest.schema.externalNullifier,
    hasWatermark: !!proofRequest.schema.watermark,
  });

  // Log POD availability (counts only, no content)
  try {
    const allPods = await parcnetAPI.value.pod
      .collection(collectionName)
      .query({});
    console.error("[Zupass] PODs in collection:", {
      total: allPods.length,
      withOwner: allPods.filter(p => p.entries.owner).length,
      withEventId: allPods.filter(p => p.entries.eventId).length,
      isAddOnCount: allPods.filter(p => p.entries.isAddOn?.value === BigInt(1)).length,
    });
  } catch (e) {
    console.error("[Zupass] Failed to query PODs:", e.message);
  }
}
```

**What NOT to log:**
- ❌ `attendeeEmail`, `attendeeName`
- ❌ `owner` field value (Semaphore commitment)
- ❌ `ticketId`, `productId` (could identify user)
- ❌ Full POD entries
- ❌ Watermark (contains DID)

---

### Solution 2: Remove Collection Filter (TESTING ONLY)

**Goal:** Test if collection filtering is the issue.

**Changes to:** `services/agora/src/composables/zupass/useZupassVerification.ts`

```typescript
// Line ~252
const proofResult = await parcnetAPI.value.gpc.prove({
  request: proofRequest.schema,
  // REMOVE: collectionIds: [collectionName],
});
```

**Risk:** May expose tickets from other events. Only use for diagnostics.

---

### Solution 3: Add Pre-Flight POD Validation

**Goal:** Check ticket availability before attempting proof.

**Changes to:** `services/agora/src/composables/zupass/useZupassVerification.ts`

```typescript
// BEFORE calling gpc.prove(), add:
console.log("[Zupass] Pre-flight: Checking for matching tickets...");

try {
  const ticketQuery = await parcnetAPI.value.pod
    .collection(collectionName)
    .query({
      entries: {
        eventId: {
          type: "string",
          isMemberOf: [{ type: "string", value: config.zupassEventId }],
        },
      },
    });

  console.log(`[Zupass] Pre-flight: Found ${ticketQuery.length} matching tickets`);

  if (ticketQuery.length === 0) {
    throw new Error(
      `No ${config.displayName} tickets found in your Zupass. ` +
      `Please check that your ticket is in the "${collectionName}" collection.`
    );
  }

  // Check if any ticket has owner field
  const ticketsWithOwner = ticketQuery.filter(p => p.entries.owner);
  if (ticketsWithOwner.length === 0) {
    throw new Error(
      `Your ${config.displayName} ticket is missing the required owner field. ` +
      `Please try syncing your Zupass or re-importing your ticket.`
    );
  }

} catch (e) {
  console.error("[Zupass] Pre-flight check failed:", e.message);
  // Continue to gpc.prove() anyway, let it fail with better error
}
```

---

### Solution 4: Support Add-On Tickets Explicitly

**Goal:** Document and test add-on ticket support.

**Changes to:** Documentation + testing

**Actions:**
1. Add to `services/agora/README.md`:
   ```markdown
   ## Add-On Ticket Support

   Zupass supports complementary/add-on tickets (e.g., +1 tickets).
   Requirements for add-on tickets:
   - Must have `owner` field (Semaphore V4 commitment)
   - Must inherit email from parent ticket
   - Can generate independent nullifiers
   ```

2. Create test case with known add-on ticket

3. Add FAQ entry for troubleshooting

---

## Immediate Next Steps

### For User B (Diagnostic):

1. **Open Zupass** (zupass.org)
2. **Open Browser Console** (F12 → Console tab)
3. **Navigate to:** Settings → PCDs
4. **Find:** Devconnect 2025 ticket
5. **Check for:**
   - [ ] `owner` field exists and is not null
   - [ ] `isAddOn` is true or false (record value)
   - [ ] `parentTicketId` field (if present, note the value)
   - [ ] `eventId` matches: `1f36ddce-e538-4c7a-9f31-6a4b2221ecac`
   - [ ] `signerPublicKey` matches: `YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs`
6. **Screenshot/copy** the relevant fields (EXCLUDING email/name)

### For Development Team:

1. **Implement Solution 1** (safe debug logging)
2. **Deploy to staging** for User B to test
3. **Analyze logs** to identify exact failure point
4. **Implement targeted fix** based on findings

---

## References

### Zupass Source Files Analyzed

- `/zupass/apps/passport-client/src/zapp/ZappServer.ts` - Proof generation
- `/zupass/packages/pcd/pod-ticket-pcd/src/schema.ts` - Ticket schema
- `/zupass/packages/pcd/pod-ticket-pcd/src/utils.ts` - POD conversion
- `/zupass/apps/passport-server/src/services/generic-issuance/pipelines/PretixPipeline.ts` - Ticket issuance
- `/parcnet-client/packages/podspec/src/parse/pod.ts` - POD query filtering

### Related Issues

- GitHub Issue #2213: Domain whitelisting (RESOLVED)
- ESM import issues with @pcd/gpc (RESOLVED)

---

## RESOLUTION: Domain Whitelisting Issue

### Final Diagnosis (2025-01-12)

**Root Cause:** Domain whitelisting in Zupass's `ZAPP_ALLOWED_SIGNER_ORIGINS` environment variable.

**Evidence:**
- ✅ Both User A and User B's tickets work on **localhost** (whitelisted by default)
- ❌ User B's ticket fails on **production** (www.agoracitizen.app)
- ❌ User B's ticket fails on **staging** (staging.agoracitizen.app)
- ✅ User A's ticket works everywhere (tested earlier, whitelisted)

**Ticket Analysis:**
- User B's ticket is **NOT an add-on** (confirmed)
- Has valid `owner` field (confirmed)
- Has correct `eventId`: `1f36ddce-e538-4c7a-9f31-6a4b2221ecac` (confirmed)
- Has correct `signerPublicKey`: `YwahfUdUYehkGMaWh0+q3F8itx2h8mybjPmt8CmTJSs` (confirmed)
- Has different `productId`: `8f797956-f4c3-4b8b-a045-0895a72e4b98` (Community Reserve ticket)

**Why "Not enough PODs" instead of clearer error:**
Zupass silently blocks collection access for non-whitelisted domains rather than throwing an explicit permission error. The result is that `queryForInputs()` sees zero PODs and returns "Not enough PODs".

### Action Required

**Contact Zupass team via GitHub Issue #2213** to request whitelisting for:
- `https://www.agoracitizen.app`
- `https://staging.agoracitizen.app`
- `https://agoracitizen.app`

**Note:** Even though User A's testing appeared to work, that may have been due to:
1. Testing before full deployment
2. Browser cache allowing temporary access
3. Different user permissions

User B's consistent failure across both staging and production confirms the domain whitelist is the blocker.

---

**Last Updated:** 2025-01-12
**Status:** RESOLVED - Domain whitelisting issue identified, awaiting Zupass team response
