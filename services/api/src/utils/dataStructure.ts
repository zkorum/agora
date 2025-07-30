import type { SlugId } from "@/shared/types/zod.js";

export function createInterleavingMapFrom<K, V>(
    map1: Map<K, V>,
    map2: Map<K, V>,
): Map<K, V> {
    const interleavedMap = new Map<K, V>();
    const map1Entries = Array.from(map1.entries());
    const map2Entries = Array.from(map2.entries());
    for (let i = 0; i < Math.max(map1.size, map2.size); i++) {
        if (i < map1.size) {
            const key = map1Entries[i][0];
            const value = map1Entries[i][1];
            // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
            if (!interleavedMap.has(key)) {
                interleavedMap.set(key, value);
            }
        }
        if (i < map2.size) {
            const key = map2Entries[i][0];
            const value = map2Entries[i][1];
            // avoiding duplicates TODO: we actually don't need Map anymore... switch to a Set?
            if (!interleavedMap.has(key)) {
                interleavedMap.set(key, value);
            }
        }
    }
    return interleavedMap;
}

export function hexToUtf8(hexStr: string): string {
    const hexBuffer = Buffer.from(hexStr, "hex");
    const utf8Str = hexBuffer.toString("utf-8");

    return utf8Str;
}

export function decimalToHex(decimalStr: string): string {
    const hexStr = BigInt(decimalStr).toString(16);
    return hexStr;
}

export interface ConversationIds {
    conversationId: number;
    conversationSlugId: SlugId;
    conversationContentId: number;
}

export type UserIdPerParticipantId = Record<string | number, string>;

export type StatementIdPerOpinionSlugId = Record<string, string | number>;
export type OpinionIdPerStatementId = Record<string | number, number>;
export type OpinionContentIdPerOpinionId = Record<number, number>;
