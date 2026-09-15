import { z } from "zod";
import { rankingStrategySchema } from "./rankingStrategies.ts";

const positiveInteger = z.coerce.number().int().positive();
const seconds = z.coerce.number().min(0).max(600);
const localApiBaseUrl = "http://127.0.0.1:8084";
// An origin only: no credentials, paths, query parameters, or fragments.
const apiOrigin =
    /^https?:\/\/(?:[a-zA-Z0-9.-]+|\[[a-fA-F0-9:]+\])(?::[0-9]{1,5})?\/?$/;

export function parseSolidagoConfig(env: Record<string, string | undefined>) {
    const config = z
        .object({
            RANKING_WORKLOAD_MODE: z
                .enum(["iterations", "duration", "arrival-rate"])
                .default("iterations"),
            RANKING_DURATION_SECONDS: positiveInteger.default(300),
            RANKING_ARRIVAL_RATE_PER_CONVERSATION: positiveInteger.default(2),
            RANKING_MAX_VUS_PER_CONVERSATION: positiveInteger.default(100),
            RANKING_STRATEGY: rankingStrategySchema.default("cohorts"),
            RANKING_SEED: z.string().min(1).max(64).default("agora-ranking-v1"),
            RANKING_NOISE_RATE: z.coerce.number().min(0).max(1).default(0.1),
            RANKING_MAJORITY_SHARE: z.coerce
                .number()
                .min(0.5)
                .max(1)
                .default(0.8),
            RANKING_DROPOUT_RATE: z.coerce.number().min(0).max(1).default(0.5),
            RANKING_ITEM_ORDERS: z
                .string()
                .optional()
                .transform((value, context) => {
                    if (value === undefined) return {};
                    try {
                        return z
                            .record(z.string(), z.array(z.string()).min(4))
                            .parse(JSON.parse(value));
                    } catch {
                        context.addIssue({
                            code: "custom",
                            message:
                                "Expected JSON mapping conversation slugs to ordered item IDs",
                        });
                        return z.NEVER;
                    }
                }),
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
                value.RANKING_WORKLOAD_MODE !== "iterations" ||
                value.RANKING_VUS_PER_CONVERSATION <=
                    value.RANKING_USERS_PER_CONVERSATION,
            {
                message:
                    "RANKING_VUS_PER_CONVERSATION must not exceed RANKING_USERS_PER_CONVERSATION",
            },
        )
        .superRefine((value, context) => {
            for (const [slug, order] of Object.entries(
                value.RANKING_ITEM_ORDERS,
            )) {
                if (
                    !value.CONVERSATION_SLUG_IDS.includes(slug) ||
                    new Set(order).size !== order.length
                ) {
                    context.addIssue({
                        code: "custom",
                        path: ["RANKING_ITEM_ORDERS"],
                        message:
                            "Item orders must target configured conversations and contain distinct item IDs",
                    });
                }
            }
            if (
                value.RANKING_WORKLOAD_MODE === "arrival-rate" &&
                value.RANKING_MAX_VUS_PER_CONVERSATION <
                    value.RANKING_VUS_PER_CONVERSATION
            ) {
                context.addIssue({
                    code: "custom",
                    path: ["RANKING_MAX_VUS_PER_CONVERSATION"],
                    message: "Maximum VUs must cover preallocated VUs",
                });
            }
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
        workloadMode: config.RANKING_WORKLOAD_MODE,
        durationSeconds: config.RANKING_DURATION_SECONDS,
        arrivalRate: config.RANKING_ARRIVAL_RATE_PER_CONVERSATION,
        maxVusPerConversation: config.RANKING_MAX_VUS_PER_CONVERSATION,
        strategy: config.RANKING_STRATEGY,
        seed: config.RANKING_SEED,
        noiseRate: config.RANKING_NOISE_RATE,
        majorityShare: config.RANKING_MAJORITY_SHARE,
        dropoutRate: config.RANKING_DROPOUT_RATE,
        itemOrders: new Map(Object.entries(config.RANKING_ITEM_ORDERS)),
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
                ...(config.workloadMode === "arrival-rate"
                    ? {
                          executor: "constant-arrival-rate" as const,
                          rate: config.arrivalRate,
                          timeUnit: "1s",
                          duration: `${String(config.durationSeconds)}s`,
                          preAllocatedVUs: config.vusPerConversation,
                          maxVUs: config.maxVusPerConversation,
                          gracefulStop: "2m",
                      }
                    : config.workloadMode === "duration"
                      ? {
                            executor: "constant-vus" as const,
                            vus: config.vusPerConversation,
                            duration: `${String(config.durationSeconds)}s`,
                            gracefulStop: "2m",
                        }
                      : {
                            executor: "shared-iterations" as const,
                            vus: config.vusPerConversation,
                            iterations: config.usersPerConversation,
                            maxDuration: `${String(config.maxDurationSeconds)}s`,
                        }),
                tags: { conversation: conversationSlugId },
                env: { RANKING_CONVERSATION_SLUG_ID: conversationSlugId },
            },
        ]),
    );
}
