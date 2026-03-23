import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { type PostgresJsDatabase as PostgresDatabase } from "drizzle-orm/postgres-js";
import { eq, and } from "drizzle-orm";
import {
    conversationTable,
    maxdiffItemTable,
    maxdiffItemContentTable,
    maxdiffItemExternalSourceTable,
} from "@/shared-backend/schema.js";
import { zodExternalSourceConfig } from "@/shared/types/zod.js";
import { createMaxdiffItem } from "@/service/maxdiffItem.js";
import { computeItemSnapshot } from "@/service/maxdiff.js";
import { log } from "@/app.js";
import {
    processUserGeneratedHtml,
    htmlToCountedText,
} from "@/shared-app-api/html.js";
import { marked } from "marked";
import type { GitHubClient, GitHubIssue, SyncResult } from "./index.js";

// --- Pure functions ---

export function verifyWebhookSignature({
    payload,
    signature,
    secret,
}: {
    payload: string;
    signature: string;
    secret: string;
}): boolean {
    const expected =
        "sha256=" +
        createHmac("sha256", secret).update(payload).digest("hex");
    if (signature.length !== expected.length) {
        return false;
    }
    return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

const zodKnownStateReason = z.enum([
    "completed",
    "not_planned",
    "reopened",
    "duplicate",
]);

export function mapGitHubStateToLifecycle({
    state,
    stateReason,
}: {
    state: "open" | "closed";
    stateReason: string | null;
}): "active" | "completed" | "canceled" {
    if (state === "open") {
        return "active";
    }

    if (stateReason === null) {
        return "completed";
    }

    const parsed = zodKnownStateReason.safeParse(stateReason);
    if (!parsed.success) {
        return "canceled";
    }

    switch (parsed.data) {
        case "completed":
            return "completed";
        case "not_planned":
        case "duplicate":
            return "canceled";
        case "reopened":
            return "active";
    }
}

export function buildExternalId({
    repo,
    issueNumber,
}: {
    repo: string;
    issueNumber: number;
}): string {
    return `${repo}#${String(issueNumber)}`;
}

// --- GitHub webhook payload schema ---

const zodGitHubWebhookLabel = z.object({
    name: z.string(),
});

const zodGitHubWebhookIssue = z.object({
    number: z.number(),
    title: z.string(),
    body: z.string().nullable(),
    state: z.enum(["open", "closed"]),
    state_reason: z.string().nullable().default(null),
    html_url: z.string(),
    labels: z.array(zodGitHubWebhookLabel),
    assignees: z.array(z.object({ login: z.string() })),
    milestone: z
        .object({ title: z.string() })
        .nullable()
        .default(null),
});

const zodGitHubWebhookPayload = z.object({
    action: z.string(),
    issue: zodGitHubWebhookIssue,
    repository: z.object({
        full_name: z.string(),
    }),
    label: zodGitHubWebhookLabel.optional(),
});

export type GitHubWebhookPayload = z.infer<typeof zodGitHubWebhookPayload>;

export function parseWebhookPayload({
    rawPayload,
}: {
    rawPayload: unknown;
}): GitHubWebhookPayload {
    return zodGitHubWebhookPayload.parse(rawPayload);
}

// --- Webhook handler ---

interface HandleWebhookProps {
    db: PostgresDatabase;
    payload: GitHubWebhookPayload;
}

export async function handleIssueWebhook({
    db,
    payload,
}: HandleWebhookProps): Promise<void> {
    const repo = payload.repository.full_name;
    const issue = payload.issue;
    const externalId = buildExternalId({ repo, issueNumber: issue.number });

    // Find all maxdiff conversations that track this repo
    const conversations = await db
        .select({
            id: conversationTable.id,
            currentContentId: conversationTable.currentContentId,
            authorId: conversationTable.authorId,
            externalSourceConfig: conversationTable.externalSourceConfig,
        })
        .from(conversationTable)
        .where(
            and(
                eq(conversationTable.conversationType, "maxdiff"),
                eq(conversationTable.isClosed, false),
            ),
        );

    for (const conversation of conversations) {
        const parsed = zodExternalSourceConfig.safeParse(
            conversation.externalSourceConfig,
        );
        if (!parsed.success) continue;
        if (parsed.data.repository !== repo) continue;

        const targetLabel = parsed.data.label;
        const issueHasLabel = issue.labels.some(
            (l) => l.name === targetLabel,
        );

        // For "labeled" action, check the label that was just added
        if (payload.action === "labeled") {
            const addedLabel = payload.label?.name;
            if (addedLabel !== targetLabel) continue;
        }

        // For "unlabeled" action, check if the removed label is the target
        if (payload.action === "unlabeled") {
            const removedLabel = payload.label?.name;
            if (removedLabel !== targetLabel) continue;
            // Item should be deactivated (canceled) since label was removed
            await deactivateItemByExternalId({
                db,
                conversationId: conversation.id,
                externalId,
            });
            continue;
        }

        // For other actions, the issue must have the target label
        if (!issueHasLabel && payload.action !== "labeled") continue;

        if (conversation.currentContentId === null) continue;

        await upsertItemFromGitHubIssue({
            db,
            conversationId: conversation.id,
            conversationContentId: conversation.currentContentId,
            authorId: conversation.authorId,
            externalId,
            issue: {
                number: issue.number,
                title: issue.title,
                body: issue.body,
                state: issue.state,
                stateReason: issue.state_reason,
                htmlUrl: issue.html_url,
                labels: issue.labels.map((l) => l.name),
                assignees: issue.assignees.map((a) => a.login),
                milestone: issue.milestone?.title ?? null,
            },
        });
    }
}

// --- Upsert logic ---

interface UpsertItemProps {
    db: PostgresDatabase;
    conversationId: number;
    conversationContentId: number;
    authorId: string;
    externalId: string;
    issue: GitHubIssue;
}

async function upsertItemFromGitHubIssue({
    db,
    conversationId,
    conversationContentId,
    authorId,
    externalId,
    issue,
}: UpsertItemProps): Promise<void> {
    const newLifecycle = mapGitHubStateToLifecycle({
        state: issue.state,
        stateReason: issue.stateReason,
    });

    const metadata = {
        labels: issue.labels,
        assignees: issue.assignees,
        milestone: issue.milestone,
        issueNumber: issue.number,
    };

    // Check if item already exists for this conversation
    const existingRows = await db
        .select({
            maxdiffItemId: maxdiffItemExternalSourceTable.maxdiffItemId,
        })
        .from(maxdiffItemExternalSourceTable)
        .innerJoin(
            maxdiffItemTable,
            eq(
                maxdiffItemTable.id,
                maxdiffItemExternalSourceTable.maxdiffItemId,
            ),
        )
        .where(
            and(
                eq(
                    maxdiffItemExternalSourceTable.externalId,
                    externalId,
                ),
                eq(maxdiffItemTable.conversationId, conversationId),
            ),
        );

    if (existingRows.length === 0) {
        // Create new item
        const { slugId } = await createMaxdiffItem({
            db,
            conversationId,
            conversationContentId,
            authorId,
            title: issue.title,
            body: convertMarkdownToHtml({ markdown: issue.body }),
            isSeed: false,
        });

        // Look up the item ID from the slug
        const itemRows = await db
            .select({ id: maxdiffItemTable.id })
            .from(maxdiffItemTable)
            .where(eq(maxdiffItemTable.slugId, slugId));

        if (itemRows.length === 0) return;

        await db.insert(maxdiffItemExternalSourceTable).values({
            maxdiffItemId: itemRows[0].id,
            sourceType: "github_issue",
            externalId,
            externalUrl: issue.htmlUrl,
            externalMetadata: metadata,
            lastSyncedAt: new Date(),
        });

        // If issue is already closed, transition to correct lifecycle
        if (newLifecycle !== "active") {
            const snapshot = await computeItemSnapshot({
                db,
                conversationId,
                itemSlugId: slugId,
            });

            await db
                .update(maxdiffItemTable)
                .set({
                    lifecycleStatus: newLifecycle,
                    snapshotScore: snapshot.snapshotScore,
                    snapshotRank: snapshot.snapshotRank,
                    snapshotParticipantCount:
                        snapshot.snapshotParticipantCount,
                    updatedAt: new Date(),
                })
                .where(eq(maxdiffItemTable.id, itemRows[0].id));
        }

        log.info(
            `[GitHub] Created item ${slugId} from ${externalId} (${newLifecycle})`,
        );
    } else {
        // Update existing item
        const itemId = existingRows[0].maxdiffItemId;

        // Update external source metadata
        await db
            .update(maxdiffItemExternalSourceTable)
            .set({
                externalUrl: issue.htmlUrl,
                externalMetadata: metadata,
                lastSyncedAt: new Date(),
            })
            .where(
                eq(
                    maxdiffItemExternalSourceTable.maxdiffItemId,
                    itemId,
                ),
            );

        // Update content (title/body)
        const now = new Date();
        const [contentRow] = await db
            .insert(maxdiffItemContentTable)
            .values({
                maxdiffItemId: itemId,
                conversationContentId,
                title: issue.title,
                body: convertMarkdownToHtml({ markdown: issue.body }),
                createdAt: now,
            })
            .returning({ id: maxdiffItemContentTable.id });

        // Get current item state
        const currentItemRows = await db
            .select({
                slugId: maxdiffItemTable.slugId,
                lifecycleStatus: maxdiffItemTable.lifecycleStatus,
            })
            .from(maxdiffItemTable)
            .where(eq(maxdiffItemTable.id, itemId));

        if (currentItemRows.length === 0) return;
        const currentItem = currentItemRows[0];

        const wasActive =
            currentItem.lifecycleStatus === "active" ||
            currentItem.lifecycleStatus === "in_progress";
        const isDeactivating =
            newLifecycle === "completed" || newLifecycle === "canceled";

        if (wasActive && isDeactivating) {
            // Snapshot before deactivating
            const snapshot = await computeItemSnapshot({
                db,
                conversationId,
                itemSlugId: currentItem.slugId,
            });

            await db
                .update(maxdiffItemTable)
                .set({
                    currentContentId: contentRow.id,
                    lifecycleStatus: newLifecycle,
                    snapshotScore: snapshot.snapshotScore,
                    snapshotRank: snapshot.snapshotRank,
                    snapshotParticipantCount:
                        snapshot.snapshotParticipantCount,
                    updatedAt: now,
                })
                .where(eq(maxdiffItemTable.id, itemId));
        } else if (!wasActive && newLifecycle === "active") {
            // Reactivating: clear snapshot
            await db
                .update(maxdiffItemTable)
                .set({
                    currentContentId: contentRow.id,
                    lifecycleStatus: newLifecycle,
                    snapshotScore: null,
                    snapshotRank: null,
                    snapshotParticipantCount: null,
                    updatedAt: now,
                })
                .where(eq(maxdiffItemTable.id, itemId));
        } else {
            await db
                .update(maxdiffItemTable)
                .set({
                    currentContentId: contentRow.id,
                    lifecycleStatus: newLifecycle,
                    updatedAt: now,
                })
                .where(eq(maxdiffItemTable.id, itemId));
        }

        log.info(
            `[GitHub] Updated item from ${externalId} → ${newLifecycle}`,
        );
    }
}

// --- Deactivate item when label is removed ---

async function deactivateItemByExternalId({
    db,
    conversationId,
    externalId,
}: {
    db: PostgresDatabase;
    conversationId: number;
    externalId: string;
}): Promise<void> {
    const rows = await db
        .select({
            maxdiffItemId: maxdiffItemExternalSourceTable.maxdiffItemId,
        })
        .from(maxdiffItemExternalSourceTable)
        .where(
            eq(maxdiffItemExternalSourceTable.externalId, externalId),
        );

    if (rows.length === 0) return;

    const itemId = rows[0].maxdiffItemId;

    const itemRows = await db
        .select({
            slugId: maxdiffItemTable.slugId,
            lifecycleStatus: maxdiffItemTable.lifecycleStatus,
        })
        .from(maxdiffItemTable)
        .where(eq(maxdiffItemTable.id, itemId));

    if (itemRows.length === 0) return;
    const item = itemRows[0];

    if (
        item.lifecycleStatus === "completed" ||
        item.lifecycleStatus === "canceled"
    ) {
        return; // already deactivated
    }

    const snapshot = await computeItemSnapshot({
        db,
        conversationId,
        itemSlugId: item.slugId,
    });

    await db
        .update(maxdiffItemTable)
        .set({
            lifecycleStatus: "canceled",
            snapshotScore: snapshot.snapshotScore,
            snapshotRank: snapshot.snapshotRank,
            snapshotParticipantCount: snapshot.snapshotParticipantCount,
            updatedAt: new Date(),
        })
        .where(eq(maxdiffItemTable.id, itemId));

    log.info(
        `[GitHub] Deactivated item from ${externalId} (label removed)`,
    );
}

// --- Sync (initial import) ---

interface SyncProps {
    db: PostgresDatabase;
    conversationSlugId: string;
    requestingUserId: string;
    githubClient: GitHubClient;
}

export async function syncGitHubIssues({
    db,
    conversationSlugId,
    requestingUserId,
    githubClient,
}: SyncProps): Promise<SyncResult> {
    // Look up the conversation
    const conversationRows = await db
        .select({
            id: conversationTable.id,
            currentContentId: conversationTable.currentContentId,
            authorId: conversationTable.authorId,
            externalSourceConfig: conversationTable.externalSourceConfig,
            conversationType: conversationTable.conversationType,
        })
        .from(conversationTable)
        .where(eq(conversationTable.slugId, conversationSlugId));

    if (conversationRows.length === 0) {
        throw new Error("Conversation not found");
    }

    const conversation = conversationRows[0];

    if (conversation.authorId !== requestingUserId) {
        throw new Error("Only the conversation author can trigger sync");
    }

    if (conversation.conversationType !== "maxdiff") {
        throw new Error("Sync is only available for MaxDiff conversations");
    }

    const parsed = zodExternalSourceConfig.safeParse(
        conversation.externalSourceConfig,
    );
    if (!parsed.success) {
        throw new Error(
            "Conversation has no valid external source configuration",
        );
    }
    if (conversation.currentContentId === null) {
        throw new Error("Conversation has no content");
    }

    const issues = await githubClient.listIssues({
        repo: parsed.data.repository,
        label: parsed.data.label,
    });

    let created = 0;
    let updated = 0;

    for (const issue of issues) {
        const externalId = buildExternalId({
            repo: parsed.data.repository,
            issueNumber: issue.number,
        });

        // Check if item already exists
        const existingRows = await db
            .select({
                maxdiffItemId:
                    maxdiffItemExternalSourceTable.maxdiffItemId,
            })
            .from(maxdiffItemExternalSourceTable)
            .where(
                eq(
                    maxdiffItemExternalSourceTable.externalId,
                    externalId,
                ),
            );

        if (existingRows.length === 0) {
            await upsertItemFromGitHubIssue({
                db,
                conversationId: conversation.id,
                conversationContentId: conversation.currentContentId,
                authorId: conversation.authorId,
                externalId,
                issue,
            });
            created++;
        } else {
            await upsertItemFromGitHubIssue({
                db,
                conversationId: conversation.id,
                conversationContentId: conversation.currentContentId,
                authorId: conversation.authorId,
                externalId,
                issue,
            });
            updated++;
        }
    }

    log.info(
        `[GitHub] Sync for ${conversationSlugId}: created=${String(created)}, updated=${String(updated)}`,
    );

    return { created, updated };
}

// --- Production GitHub client ---

export function createGitHubClient({
    accessToken,
}: {
    accessToken: string;
}): GitHubClient {
    return {
        listIssues: async ({ repo, label }) => {
            const issues: GitHubIssue[] = [];
            let page = 1;

            // Paginate through all issues (open + closed)
            for (const state of ["open", "closed"] as const) {
                page = 1;
                let hasMore = true;
                while (hasMore) {
                    const url = `https://api.github.com/repos/${repo}/issues?labels=${encodeURIComponent(label)}&state=${state}&per_page=100&page=${String(page)}`;
                    const response = await fetch(url, {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            Accept: "application/vnd.github+json",
                            "X-GitHub-Api-Version": "2022-11-28",
                        },
                    });

                    if (!response.ok) {
                        throw new Error(
                            `GitHub API error: ${String(response.status)} ${response.statusText}`,
                        );
                    }

                    const data = zodGitHubApiIssueList.parse(
                        await response.json(),
                    );

                    for (const item of data) {
                        // Filter out pull requests (GitHub API returns PRs too)
                        if (item.pull_request !== undefined) continue;

                        issues.push({
                            number: item.number,
                            title: item.title,
                            body: item.body,
                            state: item.state,
                            stateReason: item.state_reason,
                            htmlUrl: item.html_url,
                            labels: item.labels.map((l) => l.name),
                            assignees: item.assignees.map(
                                (a) => a.login,
                            ),
                            milestone: item.milestone?.title ?? null,
                        });
                    }

                    hasMore = data.length === 100;
                    page++;
                }
            }

            return issues;
        },
    };
}

// --- GitHub API response schema ---

const zodGitHubApiIssueList = z.array(
    z.object({
        number: z.number(),
        title: z.string(),
        body: z.string().nullable(),
        state: z.enum(["open", "closed"]),
        state_reason: z
            .enum(["completed", "not_planned", "reopened"])
            .nullable()
            .default(null),
        html_url: z.string(),
        labels: z.array(z.object({ name: z.string() })),
        assignees: z.array(z.object({ login: z.string() })),
        milestone: z
            .object({ title: z.string() })
            .nullable()
            .default(null),
        pull_request: z.object({}).optional(),
    }),
);

// --- Helpers ---

const MAX_TEXT_LENGTH = 1000;
const MAX_HTML_LENGTH = 3000;

export function convertMarkdownToHtml({
    markdown,
}: {
    markdown: string | null;
}): string | null {
    if (markdown === null) return null;
    if (markdown.trim() === "") return null;

    // Truncate source Markdown if text is too long (rough pre-check)
    let source = markdown;
    if (source.length > MAX_TEXT_LENGTH) {
        source = source.slice(0, MAX_TEXT_LENGTH);
    }

    // Convert Markdown → HTML
    const rawHtml = marked.parse(source, { async: false, gfm: true });

    // Sanitize through existing pipeline (strips dangerous tags, linkifies URLs)
    let html = processUserGeneratedHtml(rawHtml, true, "output");

    // Verify text length after conversion
    const textLength = htmlToCountedText(html).length;
    if (textLength > MAX_TEXT_LENGTH) {
        // Re-truncate source more aggressively and retry
        const ratio = MAX_TEXT_LENGTH / textLength;
        source = markdown.slice(0, Math.floor(source.length * ratio));
        const retryHtml = marked.parse(source, {
            async: false,
            gfm: true,
        });
        html = processUserGeneratedHtml(retryHtml, true, "output");
    }

    // Final safety: ensure HTML fits in varchar(3000)
    if (html.length > MAX_HTML_LENGTH) {
        html = html.slice(0, MAX_HTML_LENGTH);
    }

    return html;
}
