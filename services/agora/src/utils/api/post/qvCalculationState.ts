import type { QueryClient } from "@tanstack/vue-query";
import type {
  Dto,
  ProjectPageActivity,
  SSEEventDataByType,
} from "src/shared/types/dto";
import type { ConversationMetadata } from "src/shared/types/zod";
import { shallowRef } from "vue";
import type { z } from "zod";

type CalculationEvent =
  SSEEventDataByType["conversation_qv_calculation_updated"];
type Result = z.infer<typeof Dto.qvResultsResponse>;
interface Frontier {
  readonly generation: number;
  readonly status: CalculationEvent["status"];
  readonly epoch: number;
  readonly pendingEpochs: readonly number[];
  readonly requiresFreshRead: boolean;
}
let nextEpoch = 0;
const clients = new WeakMap<QueryClient, ReturnType<typeof createState>>();
function createState() {
  return shallowRef(new Map<string, Frontier>());
}
function state(queryClient: QueryClient) {
  let current = clients.get(queryClient);
  if (current === undefined) {
    current = createState();
    clients.set(queryClient, current);
  }
  return current;
}
function current({
  queryClient,
  slug,
}: {
  queryClient: QueryClient;
  slug: string;
}): Frontier {
  return (
    state(queryClient).value.get(slug) ?? {
      generation: 0,
      status: "open",
      epoch: 0,
      pendingEpochs: [],
      requiresFreshRead: false,
    }
  );
}
export function getQvCalculationFrontier(params: {
  queryClient: QueryClient;
  slug: string;
}) {
  const frontier = current(params);
  return { ...frontier, pending: frontier.pendingEpochs.length > 0 };
}
function setFrontier({
  queryClient,
  slug,
  frontier,
}: {
  queryClient: QueryClient;
  slug: string;
  frontier: Frontier;
}): void {
  const value = state(queryClient);
  value.value = new Map(value.value).set(slug, frontier);
}
function phase(status: CalculationEvent["status"]): number {
  return status === "open" ? 0 : status === "calculating" ? 1 : 2;
}
export function retainQvCalculationEvent({
  queryClient,
  data,
}: {
  queryClient: QueryClient;
  data: CalculationEvent;
}): boolean {
  const previous = current({ queryClient, slug: data.conversationSlugId });
  if (
    data.generation < previous.generation ||
    (data.generation === previous.generation &&
      phase(data.status) <= phase(previous.status))
  )
    return false;
  setFrontier({
    queryClient,
    slug: data.conversationSlugId,
    frontier: { ...previous, generation: data.generation, status: data.status },
  });
  return true;
}
export function beginQvLifecycleChange({
  queryClient,
  slug,
}: {
  queryClient: QueryClient;
  slug: string;
}) {
  const previous = current({ queryClient, slug });
  const epoch = ++nextEpoch;
  // Do not guess a server generation: two local clicks may produce one accepted
  // transition. Block cached results until every command settles and a fresh read wins.
  setFrontier({
    queryClient,
    slug,
    frontier: {
      ...previous,
      epoch,
      pendingEpochs: [...previous.pendingEpochs, epoch],
      requiresFreshRead: true,
    },
  });
  return { epoch };
}
export function settleQvLifecycleChange({
  queryClient,
  slug,
  change,
}: {
  queryClient: QueryClient;
  slug: string;
  change: ReturnType<typeof beginQvLifecycleChange>;
}): void {
  const previous = current({ queryClient, slug });
  if (!previous.pendingEpochs.includes(change.epoch)) return;
  // Rejections/transport failures can race another accepted command too. In both
  // cases only the writer-authorized result read clears the freshness barrier.
  setFrontier({
    queryClient,
    slug,
    frontier: {
      ...previous,
      pendingEpochs: previous.pendingEpochs.filter(
        (epoch) => epoch !== change.epoch
      ),
    },
  });
}
export function clearQvCalculationFrontiers(queryClient: QueryClient): void {
  const value = clients.get(queryClient);
  if (value !== undefined) value.value = new Map();
}
export function acceptQvResultRead({
  queryClient,
  slug,
  epoch,
  result,
}: {
  queryClient: QueryClient;
  slug: string;
  epoch: number;
  result: Result;
}): Result | undefined {
  const previous = current({ queryClient, slug });
  if (
    previous.pendingEpochs.length > 0 ||
    previous.epoch !== epoch ||
    result.generation < previous.generation ||
    (result.generation === previous.generation &&
      phase(result.status) < phase(previous.status))
  )
    return undefined;
  if (result.generation > 0)
    retainQvCalculationEvent({
      queryClient,
      data: {
        conversationSlugId: slug,
        generation: result.generation,
        status: result.status,
      },
    });
  setFrontier({
    queryClient,
    slug,
    frontier: { ...current({ queryClient, slug }), requiresFreshRead: false },
  });
  return result;
}

export function reconcileQvCalculationLifecycle<
  T extends { metadata: ConversationMetadata },
>({
  queryClient,
  conversation,
}: {
  queryClient: QueryClient;
  conversation: T;
}): T {
  const metadata = conversation.metadata;
  if (
    metadata.conversationType !== "prioritizing" ||
    metadata.prioritizationType !== "qv"
  )
    return conversation;
  const slug = metadata.conversationSlugId;
  const generation = metadata.qvGeneration ?? 0;
  const previous = current({ queryClient, slug });
  if (previous.pendingEpochs.length > 0) return conversation;
  // Metadata flags can be optimistic during an owner's command. Only the
  // writer-side result read may settle that local freshness barrier.
  if (!previous.requiresFreshRead && generation > previous.generation) {
    retainQvCalculationEvent({
      queryClient,
      data: {
        conversationSlugId: slug,
        generation,
        status: metadata.isClosed ? "calculating" : "open",
      },
    });
  }
  const frontier = current({ queryClient, slug });
  if (
    frontier.generation > generation ||
    (frontier.generation > 0 &&
      !frontier.requiresFreshRead &&
      frontier.generation === generation &&
      (metadata.isClosed !== (frontier.status !== "open") ||
        (phase(frontier.status) === 2 && metadata.isFinalizing === true)))
  ) {
    return {
      ...conversation,
      metadata: {
        ...metadata,
        qvGeneration: frontier.generation,
        isClosed: frontier.status !== "open",
        isFinalizing: frontier.status === "calculating",
      },
    };
  }
  return conversation;
}

export function reconcileProjectQvCalculationLifecycle({
  queryClient,
  activity,
}: {
  queryClient: QueryClient;
  activity: ProjectPageActivity;
}): ProjectPageActivity {
  if (!activity.isIndexed || activity.prioritizationType !== "qv")
    return activity;
  const previous = current({ queryClient, slug: activity.slugId });
  if (previous.pendingEpochs.length > 0) return activity;
  const generation = activity.qvGeneration ?? 0;
  if (!previous.requiresFreshRead && generation > previous.generation)
    retainQvCalculationEvent({
      queryClient,
      data: {
        conversationSlugId: activity.slugId,
        generation,
        status: activity.isClosed ? "calculating" : "open",
      },
    });
  const frontier = current({ queryClient, slug: activity.slugId });
  if (
    frontier.generation > generation ||
    (frontier.generation > 0 &&
      frontier.generation === generation &&
      !frontier.requiresFreshRead &&
      activity.isClosed !== (frontier.status !== "open"))
  )
    return {
      ...activity,
      qvGeneration: frontier.generation,
      isClosed: frontier.status !== "open",
    };
  return activity;
}
