import type { Valkey } from "@/shared-backend/valkey.js";
import { VALKEY_QUEUE_KEYS } from "@/shared-backend/valkeyQueues.js";

export async function sealVoteBuffer({
    valkey,
    epoch,
}: {
    valkey: Valkey;
    epoch: string;
}): Promise<void> {
    // Epochs are never reused. A delayed seal cannot affect a reopened scope,
    // and reopening requires no cache operation that could race with closing.
    await valkey.set(
        `${VALKEY_QUEUE_KEYS.VOTE_BUFFER_DATA}:gate:${epoch}`,
        "closed",
        { expiry: { type: TimeUnit.Seconds, count: 86_400 } },
    );
}
import { TimeUnit } from "@valkey/valkey-glide";
