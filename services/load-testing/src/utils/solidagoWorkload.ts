import { z } from "zod";
import type { MaxDiffSaveRequest } from "../shared/types/dto.js";

const positiveInteger = z.coerce.number().int().positive();
const seconds = z.coerce.number().min(0).max(600);
const localApiBaseUrl = "http://127.0.0.1:8084";
// An origin only: no credentials, paths, query parameters, or fragments.
const apiOrigin =
    /^https?:\/\/(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::[0-9]{1,5})?\/?$/;

export function parseSolidagoConfig(env: Record<string, string | undefined>) {
    const config = z
        .object({
            API_BASE_URL: z
                .string()
                .regex(
                    apiOrigin,
                    "API_BASE_URL must be an HTTP(S) origin without credentials, path, query, or fragment",
                )
                .default(localApiBaseUrl)
                .transform((value) => value.replace(/\/$/, "")),
            BACKEND_DID: z
                .string()
                .regex(/^did:(?:web|key):[a-zA-Z0-9._:%-]+$/)
                .optional(),
            RANKING_ALLOW_INSECURE_HTTP: z
                .enum(["true", "false"])
                .default("false"),
            CONVERSATION_SLUG_IDS: z
                .string()
                .transform((value) =>
                    value.split(",").map((slug) => slug.trim()),
                )
                .pipe(z.array(z.string().regex(/^[a-zA-Z0-9_-]{1,10}$/)).min(1))
                .refine(
                    (slugs) => new Set(slugs).size === slugs.length,
                    "Conversation slugs must be unique",
                ),
            RANKING_USERS_PER_CONVERSATION: positiveInteger.default(100),
            RANKING_VUS_PER_CONVERSATION: positiveInteger.default(10),
            RANKING_COMPARISONS_PER_USER: positiveInteger.default(20),
            RANKING_THINK_TIME_SECONDS: seconds.default(0.5),
            RANKING_COOLDOWN_SECONDS: seconds.default(30),
            RANKING_MAX_DURATION_SECONDS: positiveInteger.default(1800),
        })
        .refine(
            (value) =>
                value.RANKING_VUS_PER_CONVERSATION <=
                value.RANKING_USERS_PER_CONVERSATION,
            {
                message:
                    "RANKING_VUS_PER_CONVERSATION must not exceed RANKING_USERS_PER_CONVERSATION",
            },
        )
        .superRefine((value, context) => {
            if (
                value.API_BASE_URL !== localApiBaseUrl &&
                value.BACKEND_DID === undefined
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["BACKEND_DID"],
                    message:
                        "Set BACKEND_DID explicitly when overriding API_BASE_URL",
                });
            }
            if (
                value.API_BASE_URL.startsWith("http:") &&
                !/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]+)?$/i.test(
                    value.API_BASE_URL,
                ) &&
                value.RANKING_ALLOW_INSECURE_HTTP !== "true"
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["API_BASE_URL"],
                    message:
                        "Use HTTPS outside loopback, or explicitly set RANKING_ALLOW_INSECURE_HTTP=true for a disposable private network",
                });
            }
        })
        .parse(env);

    return {
        conversations: config.CONVERSATION_SLUG_IDS,
        usersPerConversation: config.RANKING_USERS_PER_CONVERSATION,
        vusPerConversation: config.RANKING_VUS_PER_CONVERSATION,
        comparisonsPerUser: config.RANKING_COMPARISONS_PER_USER,
        thinkTimeSeconds: config.RANKING_THINK_TIME_SECONDS,
        cooldownSeconds: config.RANKING_COOLDOWN_SECONDS,
        maxDurationSeconds: config.RANKING_MAX_DURATION_SECONDS,
        apiBaseUrl: config.API_BASE_URL,
        backendDid: config.BACKEND_DID ?? "did:web:localhost%3A8084",
    };
}

export function buildSolidagoScenarios(
    config: ReturnType<typeof parseSolidagoConfig>,
) {
    return Object.fromEntries(
        config.conversations.map((conversationSlugId) => [
            `ranking_${conversationSlugId}`,
            {
                executor: "shared-iterations" as const,
                vus: config.vusPerConversation,
                iterations: config.usersPerConversation,
                maxDuration: `${String(config.maxDurationSeconds)}s`,
                tags: { conversation: conversationSlugId },
                env: { RANKING_CONVERSATION_SLUG_ID: conversationSlugId },
            },
        ]),
    );
}

export function chooseComparison({
    candidateSet,
    preferenceGroup,
}: {
    candidateSet: string[];
    preferenceGroup: number;
}): MaxDiffSaveRequest["comparisons"][number] {
    // A group keeps the same preference ordering across sets and participants.
    const ordered = [...new Set(candidateSet)]
        .map((item) => {
            let preference = 2166136261;
            for (const character of `${String(preferenceGroup)}:${item}`) {
                preference =
                    Math.imul(
                        preference ^ character.charCodeAt(0),
                        16777619,
                    ) >>> 0;
            }
            return { item, preference };
        })
        .sort(
            (a, b) =>
                b.preference - a.preference || a.item.localeCompare(b.item),
        );
    const best = ordered.at(0)?.item;
    const worst = ordered.at(-1)?.item;
    if (
        best === undefined ||
        worst === undefined ||
        best === worst ||
        ordered.length !== candidateSet.length
    ) {
        throw new Error(
            "Server candidate set must contain at least two distinct items and no duplicates",
        );
    }
    return { best, worst, set: [...candidateSet] };
}
