import { z } from "zod";
import { zodVotingAction } from "@/shared/types/zod.js";

export const bufferedVoteSchema = z.object({
    userId: z.uuid(),
    opinionId: z.number().int(),
    opinionContentId: z.number().int(),
    conversationId: z.number().int(),
    vote: zodVotingAction,
    timestamp: z.coerce.date(),
    voteBufferEpoch: z.uuid(),
    bufferSequence: z.number().int().positive(),
});

export type BufferedVote = z.infer<typeof bufferedVoteSchema>;

export function getBufferedVoteKey(
    vote: Pick<BufferedVote, "userId" | "opinionId" | "voteBufferEpoch">,
): string {
    return `${vote.userId}:${vote.voteBufferEpoch}:${String(vote.opinionId)}`;
}

// Old deployment payloads and corrupt entries must not stall a whole batch.
export function parseBufferedVote(payload: string): BufferedVote | undefined {
    let value: unknown;
    try {
        value = JSON.parse(payload);
    } catch {
        return undefined;
    }
    const result = bufferedVoteSchema.safeParse(value);
    return result.success ? result.data : undefined;
}

export type VoteBufferInput = Omit<
    BufferedVote,
    "voteBufferEpoch" | "bufferSequence"
> & {
    scope?: { epoch: string; minimumSequence: number };
    clientAction?: { sessionId: string; sequence: number };
};
