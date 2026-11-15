import { uid } from "quasar";
import type { Dto } from "src/shared/types/dto";
import { parseQvBallot, type QvAllocation } from "src/shared/utils/qv";
import { computed, ref, shallowRef } from "vue";
import type { z } from "zod";

type Snapshot = z.infer<typeof Dto.qvLoadResponse>;
type SavedResponse = Snapshot["response"];
type MutationFailure = Extract<
  z.infer<typeof Dto.qvMutationResponse>,
  { success: false }
>;
type QvPendingCommand = (
  | { action: "save"; request: z.infer<typeof Dto.qvSaveRequest> }
  | { action: "withdraw"; request: z.infer<typeof Dto.qvWithdrawRequest> }
) & { localSignature: string };

function signature(allocations: readonly QvAllocation[]): string {
  return JSON.stringify(
    allocations
      .map(({ itemId, votes }) => ({ itemId, votes }))
      .sort((a, b) => (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0))
  );
}
function localAllocations(response: SavedResponse): QvAllocation[] {
  return (
    response.saved?.allocations.map(({ itemId, votes }) => ({
      itemId,
      votes,
    })) ?? []
  );
}
export function useQvResponseState() {
  const snapshot = shallowRef<Snapshot>();
  const latest = shallowRef<Snapshot>();
  const baseline = shallowRef<SavedResponse>({ revision: 0 });
  const allocations = ref<QvAllocation[]>([]);
  const pending = shallowRef<QvPendingCommand>();
  const conflict = ref(false);
  let navigationDiscardSignature: string | undefined;
  const hasUnsavedChanges = computed(
    () =>
      signature(allocations.value) !==
      signature(localAllocations(baseline.value))
  );
  const statementsChanged = computed(
    () =>
      snapshot.value !== undefined &&
      latest.value !== undefined &&
      snapshot.value.statementSetRevision !== latest.value.statementSetRevision
  );
  const canSave = computed(() => {
    const current = snapshot.value;
    if (
      current === undefined ||
      current.isClosed ||
      conflict.value ||
      statementsChanged.value
    )
      return false;
    const ballot = parseQvBallot({
      allocations: allocations.value,
      config: { allowNegativeVotes: current.allowOpposition },
    });
    const itemIds = new Set(current.items.map((item) => item.slugId));
    return (
      hasUnsavedChanges.value &&
      ballot.valid &&
      ballot.allocations.length > 0 &&
      allocations.value.every(({ itemId }) => itemIds.has(itemId))
    );
  });
  function receive(incoming: Snapshot): void {
    // An older request cannot roll the baseline back after an accepted command.
    if (
      incoming.response.revision <
        Math.max(
          baseline.value.revision,
          latest.value?.response.revision ?? 0
        ) ||
      incoming.statementSetRevision < (latest.value?.statementSetRevision ?? 0)
    )
      return;
    latest.value = incoming;
    if (
      snapshot.value === undefined ||
      (!hasUnsavedChanges.value && pending.value === undefined)
    ) {
      snapshot.value = incoming;
      baseline.value = incoming.response;
      allocations.value = localAllocations(incoming.response);
    } else {
      if (
        incoming.response.revision > baseline.value.revision &&
        pending.value === undefined
      )
        conflict.value = true;
      // Same source revision may carry a newly available translation.
      if (incoming.statementSetRevision === snapshot.value.statementSetRevision)
        snapshot.value = { ...incoming, response: baseline.value };
    }
  }
  function begin({
    action,
    conversationSlugId,
  }: {
    action: "save" | "withdraw";
    conversationSlugId: string;
  }): QvPendingCommand | undefined {
    if (pending.value !== undefined) return pending.value;
    const current = snapshot.value;
    if (
      current === undefined ||
      conflict.value ||
      statementsChanged.value ||
      current.isClosed
    )
      return undefined;
    const common = {
      conversationSlugId,
      expectedViewerId: current.viewerId,
      commandId: uid(),
      expectedResponseRevision: baseline.value.revision,
    };
    const localSignature = signature(allocations.value);
    if (action === "withdraw") {
      if (baseline.value.saved === undefined) return undefined;
      pending.value = { action, request: common, localSignature };
    } else {
      if (!canSave.value) return undefined;
      const items = new Map(current.items.map((item) => [item.slugId, item]));
      const reviewed = allocations.value.flatMap(({ itemId, votes }) => {
        const item = items.get(itemId);
        return item === undefined
          ? []
          : [
              {
                itemId,
                votes,
                sourceVersion: item.displayContent.sourceVersion,
              },
            ];
      });
      pending.value = {
        action,
        request: {
          ...common,
          expectedStatementSetRevision: current.statementSetRevision,
          allocations: reviewed,
        },
        localSignature,
      };
    }
    return pending.value;
  }
  function accept(response: SavedResponse): void {
    const command = pending.value;
    pending.value = undefined;
    const discardLocal =
      navigationDiscardSignature !== undefined &&
      navigationDiscardSignature === signature(allocations.value);
    navigationDiscardSignature = undefined;
    if (
      response.revision < baseline.value.revision ||
      (latest.value !== undefined &&
        latest.value.response.revision > response.revision)
    ) {
      conflict.value = true;
      return;
    }
    if (
      discardLocal ||
      (command?.action === "withdraw" &&
        command.localSignature === signature(allocations.value))
    )
      allocations.value = localAllocations(response);
    baseline.value = response;
    if (snapshot.value !== undefined)
      snapshot.value = { ...snapshot.value, response };
    if (latest.value !== undefined)
      latest.value = { ...latest.value, response };
  }
  function reject(
    reason: MutationFailure["reason"] | "request_rejected"
  ): void {
    pending.value = undefined;
    navigationDiscardSignature = undefined;
    if (
      [
        "statement_conflict",
        "response_conflict",
        "idempotency_conflict",
        "identity_conflict",
      ].includes(reason)
    )
      conflict.value = true;
  }
  function discard(): void {
    if (pending.value !== undefined) return;
    if (latest.value !== undefined) {
      snapshot.value = latest.value;
      baseline.value = latest.value.response;
    }
    allocations.value = localAllocations(baseline.value);
    conflict.value = false;
  }
  function discardForNavigation(): void {
    if (pending.value === undefined) {
      discard();
      return;
    }
    // Leaving cannot cancel an explicitly sent request. Only discard local edits;
    // adopt its accepted baseline later unless the participant has edited again.
    allocations.value = localAllocations(baseline.value);
    navigationDiscardSignature = signature(allocations.value);
  }
  return {
    snapshot,
    baseline,
    allocations,
    pending,
    conflict,
    hasUnsavedChanges,
    statementsChanged,
    canSave,
    receive,
    begin,
    accept,
    reject,
    discard,
    discardForNavigation,
  };
}
