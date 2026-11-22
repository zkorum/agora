import { log } from "@/app.js";
import { logApiError } from "@/logging/privacy.js";
import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";

/** Wake the ordinary scoring worker after commit; reconciliation recovers missed wakes. */
export async function scheduleRankingStatsRefresh({
    valkey,
    conversationId,
    conversationSlugId,
}: {
    valkey: Valkey | undefined;
    conversationId: number;
    conversationSlugId: string;
}): Promise<void> {
    if (valkey === undefined) return;
    try {
        await valkey.zadd(VALKEY_QUEUE_KEYS.SCORING_DIRTY_SOLIDAGO, {
            [`${String(conversationId)}:${conversationSlugId}`]: 0,
        });
    } catch (error) {
        logApiError({
            logger: log,
            level: "error",
            event: { event: "application_error" },
            error,
        });
    }
}
