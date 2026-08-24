import { createHash } from "node:crypto";
import { and, eq, gt } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { getPrimaryDatabase } from "@/shared-backend/db.js";
import {
    conversationEmailUpdateActionTokenTable,
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateRecipientConversationTable,
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateReportTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserProjectPreferenceTable,
    conversationTable,
    projectTable,
    userTable,
} from "@/shared-backend/schema.js";
import {
    Dto,
    type ConversationEmailUpdateActionManageOptOutRequest,
    type ConversationEmailUpdateActionManageOptOutResponse,
    type ConversationEmailUpdateActionReportRequest,
    type ConversationEmailUpdateActionReportResponse,
    type ConversationEmailUpdateActionResolveRequest,
    type ConversationEmailUpdateActionResolveResponse,
    type ConversationEmailUpdateActionUnsubscribeRequest,
    type ConversationEmailUpdateActionUnsubscribeResponse,
} from "@/shared/types/dto.js";

function readActionToken(value: unknown): string | undefined {
    if (typeof value !== "object" || value === null || !("token" in value)) {
        return undefined;
    }
    return typeof value.token === "string" ? value.token : undefined;
}

export function conversationEmailUpdateActionRateLimitKey(
    request: FastifyRequest,
): string {
    const token =
        readActionToken(request.body) ?? readActionToken(request.params);
    return token === undefined
        ? "invalid-capability"
        : `capability:${hashConversationEmailUpdateActionToken(token)}`;
}

const PUBLIC_ACTION_RATE_LIMIT = {
    max: 30,
    timeWindow: 60 * 1000,
    keyGenerator: conversationEmailUpdateActionRateLimitKey,
};
const PUBLIC_ACTION_MUTATION_RATE_LIMIT = {
    max: 10,
    timeWindow: 60 * 1000,
    keyGenerator: conversationEmailUpdateActionRateLimitKey,
};
const PUBLIC_ACTION_CSP =
    "default-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'";
const PUBLIC_ACTION_MAX_CONCURRENCY = 64;

const unavailable = { success: false, reason: "unavailable" } as const;

export interface ConversationEmailUpdateActionConcurrencyGuard {
    run: <T>(operation: () => Promise<T>) => Promise<T | undefined>;
}

export function createConversationEmailUpdateActionConcurrencyGuard({
    maximumConcurrent,
}: {
    maximumConcurrent: number;
}): ConversationEmailUpdateActionConcurrencyGuard {
    let active = 0;
    return {
        run: async (operation) => {
            if (active >= maximumConcurrent) return undefined;
            active += 1;
            try {
                return await operation();
            } finally {
                active -= 1;
            }
        },
    };
}

interface ConversationEmailUpdateActionConversation {
    conversationId: number;
    conversationSlugId: string;
    title: string;
}

interface ConversationEmailUpdateActionScopeProject {
    kind: "project";
    projectSlug: string;
    title: string;
    conversations: ConversationEmailUpdateActionConversation[];
}

interface ConversationEmailUpdateActionScopeNoProject {
    kind: "no_project";
    conversations: ConversationEmailUpdateActionConversation[];
}

type ConversationEmailUpdateActionScope =
    | ConversationEmailUpdateActionScopeProject
    | ConversationEmailUpdateActionScopeNoProject;

function toPublicScope(scope: ConversationEmailUpdateActionScope) {
    const conversations = scope.conversations.map((conversation) => ({
        conversationSlugId: conversation.conversationSlugId,
        title: conversation.title,
    }));
    return scope.kind === "project"
        ? {
              kind: "project" as const,
              projectSlug: scope.projectSlug,
              title: scope.title,
              conversations,
          }
        : { kind: "no_project" as const, conversations };
}

export interface ConversationEmailUpdateActionService {
    resolve: (
        request: ConversationEmailUpdateActionResolveRequest,
    ) => Promise<ConversationEmailUpdateActionResolveResponse>;
    unsubscribe: (
        request: ConversationEmailUpdateActionUnsubscribeRequest,
    ) => Promise<ConversationEmailUpdateActionUnsubscribeResponse>;
    manageOptOut: (
        request: ConversationEmailUpdateActionManageOptOutRequest,
    ) => Promise<ConversationEmailUpdateActionManageOptOutResponse>;
    submitReport: (
        request: ConversationEmailUpdateActionReportRequest,
    ) => Promise<ConversationEmailUpdateActionReportResponse>;
}

export function hashConversationEmailUpdateActionToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}

async function loadAction({
    db,
    tokenHash,
    now,
    lock,
}: {
    db: PostgresJsDatabase;
    tokenHash: string;
    now: Date;
    lock: boolean;
}) {
    const query = db
        .select({
            token_id: conversationEmailUpdateActionTokenTable.id,
            action: conversationEmailUpdateActionTokenTable.action,
            recipient_id: conversationEmailUpdateRecipientTable.id,
            recipient_user_id: conversationEmailUpdateRecipientTable.userId,
            recipient_kind: conversationEmailUpdateRecipientTable.kind,
            update_id: conversationEmailUpdateTable.id,
            update_scope_kind: conversationEmailUpdateTable.scopeKind,
            update_project_id: conversationEmailUpdateTable.projectId,
            project_slug: projectTable.slug,
            project_title_snapshot:
                conversationEmailUpdateTable.projectTitleSnapshot,
            subject: conversationEmailUpdateTable.subject,
        })
        .from(conversationEmailUpdateActionTokenTable)
        .innerJoin(
            conversationEmailUpdateRecipientTable,
            eq(
                conversationEmailUpdateRecipientTable.id,
                conversationEmailUpdateActionTokenTable.recipientId,
            ),
        )
        .innerJoin(
            conversationEmailUpdateDeliveryTable,
            eq(
                conversationEmailUpdateDeliveryTable.id,
                conversationEmailUpdateRecipientTable.deliveryId,
            ),
        )
        .innerJoin(
            conversationEmailUpdateTable,
            eq(
                conversationEmailUpdateTable.id,
                conversationEmailUpdateDeliveryTable.updateId,
            ),
        )
        .innerJoin(
            projectTable,
            eq(projectTable.id, conversationEmailUpdateTable.projectId),
        )
        .where(
            and(
                eq(
                    conversationEmailUpdateActionTokenTable.tokenHash,
                    tokenHash,
                ),
                gt(conversationEmailUpdateActionTokenTable.expiresAt, now),
            ),
        )
        .limit(1)
        .$dynamic();
    const rows = lock
        ? await query.for("update", {
              of: conversationEmailUpdateActionTokenTable,
          })
        : await query;
    return rows.at(0);
}

type ActionRow = NonNullable<Awaited<ReturnType<typeof loadAction>>>;

function hasValidActionBinding(action: ActionRow): boolean {
    if (action.action === "unsubscribe_project") {
        return action.update_scope_kind === "listed_project";
    }
    if (action.action === "unsubscribe_conversation") {
        return action.update_scope_kind === "no_project";
    }
    return true;
}

async function loadRecipientConversations({
    db,
    action,
}: {
    db: PostgresJsDatabase;
    action: ActionRow;
}): Promise<ConversationEmailUpdateActionConversation[]> {
    const rows = await db
        .select({
            conversationId:
                conversationEmailUpdateRecipientConversationTable.conversationId,
            conversationSlugId: conversationTable.slugId,
            title: conversationEmailUpdateConversationTable.conversationTitleSnapshot,
        })
        .from(conversationEmailUpdateRecipientConversationTable)
        .innerJoin(
            conversationEmailUpdateConversationTable,
            and(
                eq(
                    conversationEmailUpdateConversationTable.updateId,
                    conversationEmailUpdateRecipientConversationTable.updateId,
                ),
                eq(
                    conversationEmailUpdateConversationTable.conversationId,
                    conversationEmailUpdateRecipientConversationTable.conversationId,
                ),
            ),
        )
        .innerJoin(
            conversationTable,
            eq(
                conversationTable.id,
                conversationEmailUpdateRecipientConversationTable.conversationId,
            ),
        )
        .where(
            and(
                eq(
                    conversationEmailUpdateRecipientConversationTable.recipientId,
                    action.recipient_id,
                ),
                eq(
                    conversationEmailUpdateRecipientConversationTable.updateId,
                    action.update_id,
                ),
            ),
        )
        .orderBy(conversationTable.slugId);
    return rows;
}

async function loadBoundScope({
    db,
    action,
}: {
    db: PostgresJsDatabase;
    action: ActionRow;
}): Promise<ConversationEmailUpdateActionScope | undefined> {
    const conversations = await loadRecipientConversations({ db, action });
    if (conversations.length === 0) return undefined;
    if (action.update_scope_kind === "no_project") {
        const selectedConversations = await db
            .select({
                conversationId:
                    conversationEmailUpdateConversationTable.conversationId,
            })
            .from(conversationEmailUpdateConversationTable)
            .where(
                eq(
                    conversationEmailUpdateConversationTable.updateId,
                    action.update_id,
                ),
            )
            .limit(2);
        if (selectedConversations.length !== 1 || conversations.length !== 1) {
            return undefined;
        }
    }
    return action.update_scope_kind === "listed_project"
        ? {
              kind: "project",
              projectSlug: action.project_slug,
              title: action.project_title_snapshot,
              conversations,
          }
        : { kind: "no_project", conversations };
}

async function lockRecipientUser({
    db,
    userId,
}: {
    db: PostgresJsDatabase;
    userId: string;
}): Promise<boolean> {
    const rows = await db
        .select({ id: userTable.id })
        .from(userTable)
        .where(eq(userTable.id, userId))
        .for("update");
    return rows.length === 1;
}

async function markTokenUsed({
    db,
    tokenId,
    now,
}: {
    db: PostgresJsDatabase;
    tokenId: bigint;
    now: Date;
}): Promise<void> {
    await db
        .update(conversationEmailUpdateActionTokenTable)
        .set({ lastUsedAt: now })
        .where(eq(conversationEmailUpdateActionTokenTable.id, tokenId));
}

async function disableProject({
    db,
    userId,
    projectId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    projectId: number;
    now: Date;
}): Promise<void> {
    await db
        .insert(conversationEmailUpdateUserProjectPreferenceTable)
        .values({
            userId,
            projectId,
            enabled: false,
            choiceAt: now,
            choiceSource: "unsubscribe",
        })
        .onConflictDoUpdate({
            target: [
                conversationEmailUpdateUserProjectPreferenceTable.userId,
                conversationEmailUpdateUserProjectPreferenceTable.projectId,
            ],
            set: {
                enabled: false,
                choiceAt: now,
                choiceSource: "unsubscribe",
            },
        });
}

async function disableConversation({
    db,
    userId,
    conversationId,
    now,
}: {
    db: PostgresJsDatabase;
    userId: string;
    conversationId: number;
    now: Date;
}): Promise<void> {
    await db
        .insert(conversationEmailUpdateUserConversationPreferenceTable)
        .values({
            userId,
            conversationId,
            enabled: false,
            choiceAt: now,
            choiceSource: "unsubscribe",
        })
        .onConflictDoUpdate({
            target: [
                conversationEmailUpdateUserConversationPreferenceTable.userId,
                conversationEmailUpdateUserConversationPreferenceTable.conversationId,
            ],
            set: {
                enabled: false,
                choiceAt: now,
                choiceSource: "unsubscribe",
            },
        });
}

export function createConversationEmailUpdateActionService({
    db,
}: {
    db: PostgresJsDatabase;
}): ConversationEmailUpdateActionService {
    return {
        resolve: async (request) => {
            const action = await loadAction({
                db: getPrimaryDatabase(db),
                tokenHash: hashConversationEmailUpdateActionToken(
                    request.token,
                ),
                now: new Date(),
                lock: false,
            });
            if (action === undefined || !hasValidActionBinding(action)) {
                return unavailable;
            }
            if (action.action === "unsubscribe_project") {
                return {
                    success: true,
                    action: "unsubscribe_project",
                    scope: {
                        kind: "project",
                        projectSlug: action.project_slug,
                        title: action.project_title_snapshot,
                    },
                };
            }
            const scope = await loadBoundScope({
                db: getPrimaryDatabase(db),
                action,
            });
            if (scope === undefined) return unavailable;
            if (action.action === "unsubscribe_conversation") {
                const conversation = scope.conversations.at(0);
                return conversation === undefined
                    ? unavailable
                    : {
                          success: true,
                          action: "unsubscribe_conversation",
                          scope: {
                              kind: "conversation",
                              conversationSlugId:
                                  conversation.conversationSlugId,
                              title: conversation.title,
                          },
                      };
            }
            if (action.action === "manage_preferences") {
                return {
                    success: true,
                    action: "manage_preferences",
                    scope: toPublicScope(scope),
                };
            }
            return {
                success: true,
                action: "report",
                subject: action.subject,
                scope: toPublicScope(scope),
            };
        },

        unsubscribe: async (request) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                const action = await loadAction({
                    db: tx,
                    tokenHash: hashConversationEmailUpdateActionToken(
                        request.token,
                    ),
                    now,
                    lock: true,
                });
                if (
                    action === undefined ||
                    !hasValidActionBinding(action) ||
                    (action.action !== "unsubscribe_project" &&
                        action.action !== "unsubscribe_conversation") ||
                    !(await lockRecipientUser({
                        db: tx,
                        userId: action.recipient_user_id,
                    }))
                ) {
                    return unavailable;
                }
                if (action.action === "unsubscribe_project") {
                    await disableProject({
                        db: tx,
                        userId: action.recipient_user_id,
                        projectId: action.update_project_id,
                        now,
                    });
                } else {
                    const scope = await loadBoundScope({
                        db: tx,
                        action,
                    });
                    if (scope?.kind !== "no_project") return unavailable;
                    const conversation = scope.conversations.at(0);
                    if (conversation === undefined) return unavailable;
                    await disableConversation({
                        db: tx,
                        userId: action.recipient_user_id,
                        conversationId: conversation.conversationId,
                        now,
                    });
                }
                await markTokenUsed({ db: tx, tokenId: action.token_id, now });
                return { success: true } as const;
            });
        },

        manageOptOut: async (request) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                const action = await loadAction({
                    db: tx,
                    tokenHash: hashConversationEmailUpdateActionToken(
                        request.token,
                    ),
                    now,
                    lock: true,
                });
                if (
                    action?.action !== "manage_preferences" ||
                    !hasValidActionBinding(action) ||
                    !(await lockRecipientUser({
                        db: tx,
                        userId: action.recipient_user_id,
                    }))
                ) {
                    return unavailable;
                }
                const scope = await loadBoundScope({ db: tx, action });
                if (scope === undefined) return unavailable;
                if (request.target.kind === "project") {
                    if (
                        scope.kind !== "project" ||
                        scope.projectSlug !== request.target.projectSlug
                    ) {
                        return unavailable;
                    }
                    await disableProject({
                        db: tx,
                        userId: action.recipient_user_id,
                        projectId: action.update_project_id,
                        now,
                    });
                } else {
                    const conversationSlugId =
                        request.target.conversationSlugId;
                    const conversation = scope.conversations.find(
                        (item) =>
                            item.conversationSlugId === conversationSlugId,
                    );
                    if (conversation === undefined) return unavailable;
                    await disableConversation({
                        db: tx,
                        userId: action.recipient_user_id,
                        conversationId: conversation.conversationId,
                        now,
                    });
                }
                await markTokenUsed({ db: tx, tokenId: action.token_id, now });
                return { success: true } as const;
            });
        },

        submitReport: async (request) => {
            return await getPrimaryDatabase(db).transaction(async (tx) => {
                const now = new Date();
                const action = await loadAction({
                    db: tx,
                    tokenHash: hashConversationEmailUpdateActionToken(
                        request.token,
                    ),
                    now,
                    lock: true,
                });
                if (
                    action?.action !== "report" ||
                    !hasValidActionBinding(action)
                ) {
                    return unavailable;
                }
                if ((await loadBoundScope({ db: tx, action })) === undefined) {
                    return unavailable;
                }
                await tx
                    .insert(conversationEmailUpdateReportTable)
                    .values({
                        recipientId: action.recipient_id,
                        reason: request.reason,
                        details: request.details,
                    })
                    .onConflictDoNothing({
                        target: conversationEmailUpdateReportTable.recipientId,
                    });
                await markTokenUsed({ db: tx, tokenId: action.token_id, now });
                return { success: true } as const;
            });
        },
    };
}

function setPublicActionHeaders(reply: FastifyReply): void {
    reply.headers({
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow",
        "Content-Security-Policy": PUBLIC_ACTION_CSP,
    });
}

async function hasValidOneClickBody(request: FastifyRequest): Promise<boolean> {
    if (!request.isMultipart()) {
        const contentType = request.headers["content-type"]
            ?.split(";", 1)
            .at(0)
            ?.trim()
            .toLowerCase();
        return (
            contentType === "application/x-www-form-urlencoded" &&
            Dto.conversationEmailUpdateActionOneClickBody.safeParse(
                request.body,
            ).success
        );
    }

    let foundExactField = false;
    const parts = request.parts({
        limits: {
            fieldNameSize: 64,
            fieldSize: 32,
            fields: 1,
            files: 0,
            parts: 1,
        },
    });
    for await (const part of parts) {
        if (
            part.type !== "field" ||
            foundExactField ||
            part.fieldname !== "List-Unsubscribe" ||
            part.value !== "One-Click" ||
            part.fieldnameTruncated ||
            part.valueTruncated
        ) {
            return false;
        }
        foundExactField = true;
    }
    return foundExactField;
}

export function registerConversationEmailUpdateActionRoutes({
    server,
    service,
    apiVersion,
}: {
    server: FastifyInstance;
    service: ConversationEmailUpdateActionService;
    apiVersion: string;
}): void {
    server.addContentTypeParser(
        "application/x-www-form-urlencoded",
        { parseAs: "string" },
        (_request, body, done) => {
            done(null, body);
        },
    );
    const typedServer = server.withTypeProvider<ZodTypeProvider>();
    const resolveRateLimit = server.rateLimit(PUBLIC_ACTION_RATE_LIMIT);
    const mutationRateLimit = server.rateLimit(
        PUBLIC_ACTION_MUTATION_RATE_LIMIT,
    );
    const concurrencyGuard =
        createConversationEmailUpdateActionConcurrencyGuard({
            maximumConcurrent: PUBLIC_ACTION_MAX_CONCURRENCY,
        });
    const runAction = async <T>(operation: () => Promise<T>): Promise<T> => {
        const result = await concurrencyGuard.run(operation);
        if (result === undefined) {
            throw server.httpErrors.serviceUnavailable(
                "Recipient action service is busy",
            );
        }
        return result;
    };
    typedServer.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/email-update/action/resolve`,
        onRequest: (_request, reply, done) => {
            setPublicActionHeaders(reply);
            done();
        },
        preHandler: resolveRateLimit,
        schema: {
            security: [],
            body: Dto.conversationEmailUpdateActionResolveRequest,
            response: {
                200: Dto.conversationEmailUpdateActionResolveResponse,
            },
        },
        handler: async (request) => {
            return await runAction(
                async () => await service.resolve(request.body),
            );
        },
    });
    typedServer.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/email-update/action/unsubscribe`,
        onRequest: (_request, reply, done) => {
            setPublicActionHeaders(reply);
            done();
        },
        preHandler: mutationRateLimit,
        schema: {
            security: [],
            body: Dto.conversationEmailUpdateActionUnsubscribeRequest,
            response: {
                200: Dto.conversationEmailUpdateActionUnsubscribeResponse,
            },
        },
        handler: async (request) => {
            return await runAction(
                async () => await service.unsubscribe(request.body),
            );
        },
    });
    typedServer.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/email-update/action/manage/opt-out`,
        onRequest: (_request, reply, done) => {
            setPublicActionHeaders(reply);
            done();
        },
        preHandler: mutationRateLimit,
        schema: {
            security: [],
            body: Dto.conversationEmailUpdateActionManageOptOutRequest,
            response: {
                200: Dto.conversationEmailUpdateActionManageOptOutResponse,
            },
        },
        handler: async (request) => {
            return await runAction(
                async () => await service.manageOptOut(request.body),
            );
        },
    });
    typedServer.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/email-update/action/report`,
        onRequest: (_request, reply, done) => {
            setPublicActionHeaders(reply);
            done();
        },
        preHandler: mutationRateLimit,
        schema: {
            security: [],
            body: Dto.conversationEmailUpdateActionReportRequest,
            response: {
                200: Dto.conversationEmailUpdateActionReportResponse,
            },
        },
        handler: async (request) => {
            return await runAction(
                async () => await service.submitReport(request.body),
            );
        },
    });
    typedServer.route({
        method: "POST",
        url: `/api/${apiVersion}/conversation/email-update/action/one-click/:token`,
        logLevel: "silent",
        onRequest: (_request, reply, done) => {
            setPublicActionHeaders(reply);
            done();
        },
        preHandler: mutationRateLimit,
        schema: {
            security: [],
            params: Dto.conversationEmailUpdateActionOneClickParams,
            response: {
                200: Dto.conversationEmailUpdateActionOneClickResponse,
            },
        },
        handler: async (request) => {
            if (!(await hasValidOneClickBody(request))) {
                throw server.httpErrors.badRequest(
                    "Invalid one-click unsubscribe body",
                );
            }
            return await runAction(
                async () =>
                    await service.unsubscribe({ token: request.params.token }),
            );
        },
    });
}
