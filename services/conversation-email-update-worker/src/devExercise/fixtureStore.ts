import { and, count, eq, inArray, isNull, or, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import {
    conversationContentTable,
    conversationEmailUpdateActionTokenTable,
    conversationEmailUpdateConversationTable,
    conversationEmailUpdateDeliveryAttemptTable,
    conversationEmailUpdateDeliveryTable,
    conversationEmailUpdateRecipientConversationTable,
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateReportTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateTestAttemptTable,
    conversationEmailUpdateUserConversationPreferenceTable,
    conversationEmailUpdateUserProjectPreferenceTable,
    conversationTable,
    emailTable,
    opinionContentTable,
    opinionTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userDisplayLanguageTable,
    userTable,
    voteContentTable,
    voteTable,
} from "@/shared-backend/schema.js";
import {
    acquireExerciseTargetReservation,
    assertDatabaseName,
    assertExerciseTargetReservation,
    finalizeExerciseTargetReservation,
    markExerciseTargetReservationCleaned,
    markExerciseTargetReservationPrepared,
    readOwnedExerciseTargetReservation,
} from "./databaseGuard.js";
import type {
    DatabaseObservation,
    ExerciseManifest,
    ExercisePlan,
    ExerciseReport,
} from "./schemas.js";

const INSERT_CHUNK_SIZE = 500;

export type PreparedExerciseFixture = NonNullable<ExerciseManifest["fixture"]>;
type PreparedExerciseTarget = Omit<
    PreparedExerciseFixture,
    "preparedAt" | "participantCount" | "participantReferences"
>;

export interface FixtureStore {
    prepare: (plan: ExercisePlan) => Promise<PreparedExerciseFixture>;
    attach: (params: {
        manifest: ExerciseManifest;
        fixture: PreparedExerciseFixture;
    }) => Promise<void>;
    observe: (params: {
        manifest: ExerciseManifest;
        report: ExerciseReport;
    }) => Promise<DatabaseObservation>;
    verify: (params: {
        manifest: ExerciseManifest;
        report: ExerciseReport;
    }) => Promise<string[]>;
    cleanup: (params: {
        manifest: ExerciseManifest;
        report: ExerciseReport | undefined;
    }) => Promise<void>;
    finalizeCleanup: (manifest: ExerciseManifest) => Promise<void>;
}

function chunks<T>(values: readonly T[]): T[][] {
    const result: T[][] = [];
    for (let offset = 0; offset < values.length; offset += INSERT_CHUNK_SIZE) {
        result.push(values.slice(offset, offset + INSERT_CHUNK_SIZE));
    }
    return result;
}

async function loadTarget({
    db,
    plan,
    expectedFixtureVoteIds,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
    expectedFixtureVoteIds: readonly number[] | undefined;
}): Promise<PreparedExerciseTarget> {
    const conversation = (
        await db
            .select({
                projectId: projectTable.id,
                projectSlug: projectTable.slug,
                conversationId: conversationTable.id,
                conversationContentId: conversationContentTable.id,
                conversationSlugId: conversationTable.slugId,
            })
            .from(conversationTable)
            .innerJoin(
                projectTable,
                and(
                    eq(projectTable.id, conversationTable.projectId),
                    isNull(projectTable.deletedAt),
                ),
            )
            .innerJoin(
                conversationContentTable,
                and(
                    eq(
                        conversationContentTable.id,
                        conversationTable.currentContentId,
                    ),
                    eq(
                        conversationContentTable.conversationId,
                        conversationTable.id,
                    ),
                ),
            )
            .where(
                and(
                    eq(conversationTable.slugId, plan.conversationSlugId),
                    eq(conversationTable.conversationType, "polis"),
                    eq(conversationTable.isClosed, false),
                    eq(conversationTable.isImporting, false),
                ),
            )
            .limit(2)
    ).at(0);
    if (conversation === undefined) {
        throw new Error(
            `Conversation ${plan.conversationSlugId} must be an existing active, open Polis conversation with current content and an active project`,
        );
    }

    const opinion = (
        await db
            .select({
                opinionId: opinionTable.id,
                opinionContentId: opinionContentTable.id,
            })
            .from(opinionTable)
            .innerJoin(
                opinionContentTable,
                and(
                    eq(opinionContentTable.id, opinionTable.currentContentId),
                    eq(opinionContentTable.opinionId, opinionTable.id),
                ),
            )
            .where(eq(opinionTable.conversationId, conversation.conversationId))
            .orderBy(opinionTable.id)
            .limit(1)
    ).at(0);
    if (opinion === undefined) {
        throw new Error(
            `Conversation ${plan.conversationSlugId} must have an active opinion with current content`,
        );
    }
    await assertTargetIsolation({
        db,
        conversationId: conversation.conversationId,
        expectedFixtureVoteIds,
    });
    return { ...conversation, ...opinion };
}

async function assertTargetIsolation({
    db,
    conversationId,
    expectedFixtureVoteIds,
}: {
    db: PostgresJsDatabase;
    conversationId: number;
    expectedFixtureVoteIds: readonly number[] | undefined;
}): Promise<void> {
    const [votes, updateLinks] = await Promise.all([
        db
            .select({ id: voteTable.id })
            .from(voteTable)
            .innerJoin(opinionTable, eq(opinionTable.id, voteTable.opinionId))
            .where(eq(opinionTable.conversationId, conversationId)),
        db
            .select({
                updateId: conversationEmailUpdateConversationTable.updateId,
            })
            .from(conversationEmailUpdateConversationTable)
            .where(
                eq(
                    conversationEmailUpdateConversationTable.conversationId,
                    conversationId,
                ),
            ),
    ]);
    if (updateLinks.length > 0) {
        throw new Error(
            "Target conversation already has a Conversation Email Update",
        );
    }
    const expectedVoteIds = new Set(expectedFixtureVoteIds ?? []);
    if (
        votes.length !== expectedVoteIds.size ||
        votes.some((vote) => !expectedVoteIds.has(vote.id))
    ) {
        throw new Error(
            expectedFixtureVoteIds === undefined
                ? "Target conversation must not have pre-existing votes or participants"
                : "Target conversation participation is not limited to frozen fixture votes",
        );
    }
}

async function assertNamespaceAvailable({
    db,
    plan,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
}): Promise<void> {
    for (const identityChunk of chunks(plan.identities)) {
        const existingUsers = await db
            .select({ id: userTable.id })
            .from(userTable)
            .where(
                or(
                    inArray(
                        userTable.id,
                        identityChunk.map((identity) => identity.userId),
                    ),
                    inArray(
                        userTable.username,
                        identityChunk.map((identity) => identity.username),
                    ),
                ),
            )
            .limit(1);
        const existingEmails = await db
            .select({ id: emailTable.id })
            .from(emailTable)
            .where(
                inArray(
                    emailTable.email,
                    identityChunk.map((identity) => identity.email),
                ),
            )
            .limit(1);
        if (existingUsers.length > 0 || existingEmails.length > 0) {
            throw new Error(
                `Fixture namespace ${plan.namespace} already has database identities; clean it or choose a new namespace`,
            );
        }
    }
}

async function seedParticipants({
    db,
    plan,
    fixture,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
    fixture: Omit<PreparedExerciseFixture, "participantReferences">;
}): Promise<PreparedExerciseFixture["participantReferences"]> {
    const fixtureTimestamp = new Date(
        new Date(fixture.preparedAt).getTime() - 60_000,
    );
    return await db.transaction(async (tx) => {
        const participantReferences: PreparedExerciseFixture["participantReferences"] =
            [];
        for (const identityChunk of chunks(plan.identities)) {
            const users: (typeof userTable.$inferInsert)[] = identityChunk.map(
                (identity) => ({
                    id: identity.userId,
                    username: identity.username,
                    createdAt: fixtureTimestamp,
                    updatedAt: fixtureTimestamp,
                }),
            );
            await tx.insert(userTable).values(users);

            const emails: (typeof emailTable.$inferInsert)[] =
                identityChunk.map((identity) => ({
                    email: identity.email,
                    type: "primary",
                    userId: identity.userId,
                    emailReachability: "safe",
                    createdAt: fixtureTimestamp,
                    updatedAt: fixtureTimestamp,
                }));
            const insertedEmails = await tx
                .insert(emailTable)
                .values(emails)
                .returning({ id: emailTable.id, userId: emailTable.userId });

            const languages: (typeof userDisplayLanguageTable.$inferInsert)[] =
                identityChunk.map((identity) => ({
                    userId: identity.userId,
                    languageCode: "en",
                    createdAt: fixtureTimestamp,
                    updatedAt: fixtureTimestamp,
                }));
            await tx.insert(userDisplayLanguageTable).values(languages);

            const projectPreferences: (typeof conversationEmailUpdateUserProjectPreferenceTable.$inferInsert)[] =
                identityChunk.map((identity) => ({
                    userId: identity.userId,
                    projectId: fixture.projectId,
                    enabled: true,
                    choiceAt: fixtureTimestamp,
                    choiceSource: "support",
                    createdAt: fixtureTimestamp,
                }));
            const insertedProjectPreferences = await tx
                .insert(conversationEmailUpdateUserProjectPreferenceTable)
                .values(projectPreferences)
                .returning({
                    userId: conversationEmailUpdateUserProjectPreferenceTable.userId,
                    projectId:
                        conversationEmailUpdateUserProjectPreferenceTable.projectId,
                });

            const conversationPreferences: (typeof conversationEmailUpdateUserConversationPreferenceTable.$inferInsert)[] =
                identityChunk.map((identity) => ({
                    userId: identity.userId,
                    conversationId: fixture.conversationId,
                    enabled: true,
                    choiceAt: fixtureTimestamp,
                    choiceSource: "support",
                    createdAt: fixtureTimestamp,
                }));
            const insertedConversationPreferences = await tx
                .insert(conversationEmailUpdateUserConversationPreferenceTable)
                .values(conversationPreferences)
                .returning({
                    userId: conversationEmailUpdateUserConversationPreferenceTable.userId,
                    conversationId:
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                });

            const votes: (typeof voteTable.$inferInsert)[] = identityChunk.map(
                (identity) => ({
                    authorId: identity.userId,
                    opinionId: fixture.opinionId,
                    createdAt: fixtureTimestamp,
                    updatedAt: fixtureTimestamp,
                }),
            );
            const insertedVotes = await tx
                .insert(voteTable)
                .values(votes)
                .returning({ id: voteTable.id, userId: voteTable.authorId });
            const voteContents: (typeof voteContentTable.$inferInsert)[] =
                insertedVotes.map((vote) => ({
                    voteId: vote.id,
                    opinionContentId: fixture.opinionContentId,
                    vote: "agree",
                    createdAt: fixtureTimestamp,
                }));
            const insertedContents = await tx
                .insert(voteContentTable)
                .values(voteContents)
                .returning({
                    id: voteContentTable.id,
                    voteId: voteContentTable.voteId,
                });
            const currentContentValues = insertedContents.map(
                (content) => sql`(${content.voteId}, ${content.id})`,
            );
            await tx.execute(sql`
                update ${voteTable} as fixture_vote
                set current_content_id = fixture_content.content_id
                from (values ${sql.join(currentContentValues, sql`, `)})
                    as fixture_content(vote_id, content_id)
                where fixture_vote.id = fixture_content.vote_id
            `);
            const emailsByUserId = new Map(
                insertedEmails.map((email) => [email.userId, email]),
            );
            const projectPreferencesByUserId = new Map(
                insertedProjectPreferences.map((preference) => [
                    preference.userId,
                    preference,
                ]),
            );
            const conversationPreferencesByUserId = new Map(
                insertedConversationPreferences.map((preference) => [
                    preference.userId,
                    preference,
                ]),
            );
            const votesByUserId = new Map(
                insertedVotes.map((vote) => [vote.userId, vote]),
            );
            const contentsByVoteId = new Map(
                insertedContents.map((content) => [content.voteId, content]),
            );
            for (const identity of identityChunk) {
                const email = emailsByUserId.get(identity.userId);
                const projectPreference = projectPreferencesByUserId.get(
                    identity.userId,
                );
                const conversationPreference =
                    conversationPreferencesByUserId.get(identity.userId);
                const vote = votesByUserId.get(identity.userId);
                const content =
                    vote === undefined
                        ? undefined
                        : contentsByVoteId.get(vote.id);
                if (
                    email === undefined ||
                    projectPreference === undefined ||
                    conversationPreference === undefined ||
                    vote === undefined ||
                    content === undefined
                ) {
                    throw new Error(
                        `Failed to freeze inserted relationships for ${identity.userId}`,
                    );
                }
                participantReferences.push({
                    userId: identity.userId,
                    emailId: email.id,
                    projectPreference,
                    conversationPreference,
                    voteId: vote.id,
                    voteContentId: content.id,
                });
            }
        }
        await validateFixtureRelationships({
            db: tx,
            plan,
            fixture: { ...fixture, participantReferences },
        });
        return participantReferences;
    });
}

async function validateFixtureRelationships({
    db,
    plan,
    fixture,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
    fixture: PreparedExerciseFixture;
}): Promise<void> {
    if (
        fixture.participantCount !== plan.participantCount ||
        plan.identities.length !== plan.participantCount ||
        fixture.conversationSlugId !== plan.conversationSlugId
    ) {
        throw new Error("Manifest fixture does not match the guarded plan");
    }
    const referencesByUserId = new Map(
        fixture.participantReferences.map((reference) => [
            reference.userId,
            reference,
        ]),
    );
    if (
        referencesByUserId.size !== plan.participantCount ||
        plan.identities.some((identity) => {
            const reference = referencesByUserId.get(identity.userId);
            return (
                reference?.projectPreference.userId !== identity.userId ||
                reference.projectPreference.projectId !== fixture.projectId ||
                reference.conversationPreference.userId !== identity.userId ||
                reference.conversationPreference.conversationId !==
                    fixture.conversationId
            );
        })
    ) {
        throw new Error("Manifest participant references are incomplete");
    }
    for (const identityChunk of chunks(plan.identities)) {
        const userIds = identityChunk.map((identity) => identity.userId);
        const references = identityChunk.map((identity) => {
            const reference = referencesByUserId.get(identity.userId);
            if (reference === undefined) {
                throw new Error(
                    `Missing frozen relationships for ${identity.userId}`,
                );
            }
            return reference;
        });
        const [
            users,
            emails,
            languages,
            projectPreferences,
            conversationPreferences,
            votes,
            voteContents,
        ] = await Promise.all([
            db
                .select({
                    userId: userTable.id,
                    username: userTable.username,
                    isDeleted: userTable.isDeleted,
                })
                .from(userTable)
                .where(inArray(userTable.id, userIds)),
            db
                .select({
                    id: emailTable.id,
                    userId: emailTable.userId,
                    email: emailTable.email,
                    type: emailTable.type,
                    isDeleted: emailTable.isDeleted,
                })
                .from(emailTable)
                .where(inArray(emailTable.userId, userIds)),
            db
                .select({
                    userId: userDisplayLanguageTable.userId,
                    language: userDisplayLanguageTable.languageCode,
                })
                .from(userDisplayLanguageTable)
                .where(inArray(userDisplayLanguageTable.userId, userIds)),
            db
                .select({
                    userId: conversationEmailUpdateUserProjectPreferenceTable.userId,
                    projectId:
                        conversationEmailUpdateUserProjectPreferenceTable.projectId,
                    enabled:
                        conversationEmailUpdateUserProjectPreferenceTable.enabled,
                })
                .from(conversationEmailUpdateUserProjectPreferenceTable)
                .where(
                    inArray(
                        conversationEmailUpdateUserProjectPreferenceTable.userId,
                        userIds,
                    ),
                ),
            db
                .select({
                    userId: conversationEmailUpdateUserConversationPreferenceTable.userId,
                    conversationId:
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                    enabled:
                        conversationEmailUpdateUserConversationPreferenceTable.enabled,
                })
                .from(conversationEmailUpdateUserConversationPreferenceTable)
                .where(
                    inArray(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userIds,
                    ),
                ),
            db
                .select({
                    id: voteTable.id,
                    userId: voteTable.authorId,
                    opinionId: voteTable.opinionId,
                    currentContentId: voteTable.currentContentId,
                })
                .from(voteTable)
                .where(inArray(voteTable.authorId, userIds)),
            db
                .select({
                    id: voteContentTable.id,
                    voteId: voteContentTable.voteId,
                    opinionContentId: voteContentTable.opinionContentId,
                    vote: voteContentTable.vote,
                })
                .from(voteContentTable)
                .where(
                    inArray(
                        voteContentTable.voteId,
                        references.map((reference) => reference.voteId),
                    ),
                ),
        ]);
        if (
            [
                users,
                emails,
                languages,
                projectPreferences,
                conversationPreferences,
                votes,
                voteContents,
            ].some((rows) => rows.length !== identityChunk.length)
        ) {
            throw new Error(
                `Fixture namespace ${plan.namespace} has incomplete, duplicate, or unexpected participant relationships`,
            );
        }
        const usersById = new Map(users.map((row) => [row.userId, row]));
        const emailsByUserId = new Map(emails.map((row) => [row.userId, row]));
        const languagesByUserId = new Map(
            languages.map((row) => [row.userId, row]),
        );
        const projectsByUserId = new Map(
            projectPreferences.map((row) => [row.userId, row]),
        );
        const conversationsByUserId = new Map(
            conversationPreferences.map((row) => [row.userId, row]),
        );
        const votesByUserId = new Map(votes.map((row) => [row.userId, row]));
        const contentsByVoteId = new Map(
            voteContents.map((row) => [row.voteId, row]),
        );
        for (const identity of identityChunk) {
            const reference = referencesByUserId.get(identity.userId);
            const user = usersById.get(identity.userId);
            const email = emailsByUserId.get(identity.userId);
            const language = languagesByUserId.get(identity.userId);
            const projectPreference = projectsByUserId.get(identity.userId);
            const conversationPreference = conversationsByUserId.get(
                identity.userId,
            );
            const vote = votesByUserId.get(identity.userId);
            const content =
                vote === undefined ? undefined : contentsByVoteId.get(vote.id);
            if (
                reference === undefined ||
                user?.username !== identity.username ||
                user.isDeleted ||
                email?.id !== reference.emailId ||
                email.email !== identity.email ||
                email.type !== "primary" ||
                email.isDeleted ||
                language?.language !== "en" ||
                projectPreference?.projectId !== fixture.projectId ||
                !projectPreference.enabled ||
                conversationPreference?.conversationId !==
                    fixture.conversationId ||
                !conversationPreference.enabled ||
                vote?.id !== reference.voteId ||
                vote.opinionId !== fixture.opinionId ||
                vote.currentContentId !== reference.voteContentId ||
                content?.id !== reference.voteContentId ||
                content.opinionContentId !== fixture.opinionContentId ||
                content.vote !== "agree"
            ) {
                throw new Error(
                    `Fixture participant ${identity.userId} does not exactly match frozen relationships`,
                );
            }
        }
    }
}

async function allowedOwnerUserIds({
    db,
    projectId,
}: {
    db: PostgresJsDatabase;
    projectId: number;
}): Promise<Set<string>> {
    const rows = await db
        .selectDistinct({ userId: organizationMembershipTable.userId })
        .from(projectOrganizationOwnershipTable)
        .innerJoin(
            organizationMembershipTable,
            and(
                eq(
                    organizationMembershipTable.organizationId,
                    projectOrganizationOwnershipTable.organizationId,
                ),
                isNull(organizationMembershipTable.deletedAt),
            ),
        )
        .innerJoin(
            organizationMembershipAllProjectCapabilityTable,
            and(
                eq(
                    organizationMembershipAllProjectCapabilityTable.organizationMembershipId,
                    organizationMembershipTable.id,
                ),
                eq(
                    organizationMembershipAllProjectCapabilityTable.capability,
                    "conversation_email_update",
                ),
                isNull(
                    organizationMembershipAllProjectCapabilityTable.deletedAt,
                ),
            ),
        )
        .where(
            and(
                eq(projectOrganizationOwnershipTable.projectId, projectId),
                isNull(projectOrganizationOwnershipTable.deletedAt),
            ),
        );
    return new Set(rows.map((row) => row.userId));
}

async function observeDatabase({
    db,
    manifest,
    report,
}: {
    db: PostgresJsDatabase;
    manifest: ExerciseManifest;
    report: ExerciseReport;
}): Promise<DatabaseObservation> {
    const fixture = manifest.fixture;
    if (fixture === undefined) throw new Error("Manifest has no fixture");
    const providerUpdateIds = [
        ...new Set(
            report.provider.observations.map((observation) =>
                String(observation.updateId),
            ),
        ),
    ];
    if (providerUpdateIds.length !== 1) {
        throw new Error("Provider must record exactly one update ID");
    }
    const providerUpdateId = providerUpdateIds[0];
    const updateRows = await db
        .select({
            id: conversationEmailUpdateTable.id,
            publicId: conversationEmailUpdateTable.publicId,
        })
        .from(conversationEmailUpdateTable)
        .innerJoin(
            conversationEmailUpdateConversationTable,
            and(
                eq(
                    conversationEmailUpdateConversationTable.updateId,
                    conversationEmailUpdateTable.id,
                ),
                eq(
                    conversationEmailUpdateConversationTable.conversationId,
                    fixture.conversationId,
                ),
            ),
        )
        .where(eq(conversationEmailUpdateTable.id, Number(providerUpdateId)));
    if (updateRows.length !== 1) {
        throw new Error(
            `Expected one fixture update, found ${String(updateRows.length)}`,
        );
    }
    const update = updateRows[0];

    const deliveries = await db
        .select({
            id: conversationEmailUpdateDeliveryTable.id,
            status: conversationEmailUpdateDeliveryTable.status,
            failureReason: conversationEmailUpdateDeliveryTable.failureReason,
            stopReason: conversationEmailUpdateDeliveryTable.stopReason,
            materializedParticipantCount:
                conversationEmailUpdateDeliveryTable.materializedParticipantCount,
            requiredOwnerCopyCount:
                conversationEmailUpdateDeliveryTable.requiredOwnerCopyCount,
        })
        .from(conversationEmailUpdateDeliveryTable)
        .where(eq(conversationEmailUpdateDeliveryTable.updateId, update.id));
    if (deliveries.length !== 1) {
        throw new Error(
            `Expected one fixture delivery, found ${String(deliveries.length)}`,
        );
    }
    const delivery = deliveries[0];

    const [tests, recipients, attempts, scopeCountRows, tokenCountRows] =
        await Promise.all([
            db
                .select({
                    id: conversationEmailUpdateTestAttemptTable.id,
                    status: conversationEmailUpdateTestAttemptTable.status,
                    requestedByUserId:
                        conversationEmailUpdateTestAttemptTable.requestedByUserId,
                    providerMessageId:
                        conversationEmailUpdateTestAttemptTable.providerMessageId,
                })
                .from(conversationEmailUpdateTestAttemptTable)
                .where(
                    eq(
                        conversationEmailUpdateTestAttemptTable.updateId,
                        update.id,
                    ),
                ),
            db
                .select({
                    id: conversationEmailUpdateRecipientTable.id,
                    userId: conversationEmailUpdateRecipientTable.userId,
                    kind: conversationEmailUpdateRecipientTable.kind,
                    status: conversationEmailUpdateRecipientTable.status,
                })
                .from(conversationEmailUpdateRecipientTable)
                .where(
                    eq(
                        conversationEmailUpdateRecipientTable.deliveryId,
                        delivery.id,
                    ),
                ),
            db
                .select({
                    id: conversationEmailUpdateDeliveryAttemptTable.id,
                    outcome:
                        conversationEmailUpdateDeliveryAttemptTable.outcome,
                    providerMessageId:
                        conversationEmailUpdateDeliveryAttemptTable.providerMessageId,
                })
                .from(conversationEmailUpdateDeliveryAttemptTable)
                .innerJoin(
                    conversationEmailUpdateRecipientTable,
                    eq(
                        conversationEmailUpdateRecipientTable.id,
                        conversationEmailUpdateDeliveryAttemptTable.recipientId,
                    ),
                )
                .where(
                    eq(
                        conversationEmailUpdateRecipientTable.deliveryId,
                        delivery.id,
                    ),
                ),
            db
                .select({ value: count() })
                .from(conversationEmailUpdateRecipientConversationTable)
                .where(
                    eq(
                        conversationEmailUpdateRecipientConversationTable.deliveryId,
                        delivery.id,
                    ),
                ),
            db
                .select({ value: count() })
                .from(conversationEmailUpdateActionTokenTable)
                .innerJoin(
                    conversationEmailUpdateRecipientTable,
                    eq(
                        conversationEmailUpdateRecipientTable.id,
                        conversationEmailUpdateActionTokenTable.recipientId,
                    ),
                )
                .where(
                    eq(
                        conversationEmailUpdateRecipientTable.deliveryId,
                        delivery.id,
                    ),
                ),
        ]);
    const participantIds = new Set(
        manifest.plan.identities.map((identity) => identity.userId),
    );
    const ownerIds = await allowedOwnerUserIds({
        db,
        projectId: fixture.projectId,
    });
    const outsideFixtureRecipientUserIds = [
        ...new Set([
            ...recipients.flatMap((recipient) =>
                recipient.kind === "participant"
                    ? participantIds.has(recipient.userId)
                        ? []
                        : [recipient.userId]
                    : ownerIds.has(recipient.userId)
                      ? []
                      : [recipient.userId],
            ),
            ...tests.flatMap((test) =>
                ownerIds.has(test.requestedByUserId)
                    ? []
                    : [test.requestedByUserId],
            ),
        ]),
    ];
    const recipientOutcomeCounts: Record<string, number> = {};
    for (const recipient of recipients) {
        recipientOutcomeCounts[recipient.status] =
            (recipientOutcomeCounts[recipient.status] ?? 0) + 1;
    }
    const testAttemptStatuses: Record<string, number> = {};
    for (const test of tests) {
        testAttemptStatuses[test.status] =
            (testAttemptStatuses[test.status] ?? 0) + 1;
    }
    const deliveryAttemptOutcomeCounts: Record<string, number> = {};
    for (const attempt of attempts) {
        deliveryAttemptOutcomeCounts[attempt.outcome] =
            (deliveryAttemptOutcomeCounts[attempt.outcome] ?? 0) + 1;
    }
    return {
        updateId: update.id,
        updatePublicId: update.publicId,
        testAttemptIds: tests.map((test) => test.id),
        testAttemptStatuses,
        deliveryId: delivery.id,
        deliveryStatus: delivery.status,
        deliveryFailureReason: delivery.failureReason ?? undefined,
        deliveryStopReason: delivery.stopReason ?? undefined,
        materializedParticipantCount: delivery.materializedParticipantCount,
        requiredOwnerCopyCount: delivery.requiredOwnerCopyCount,
        participantRecipientIds: recipients
            .filter((recipient) => recipient.kind === "participant")
            .map((recipient) => String(recipient.id)),
        ownerRecipientIds: recipients
            .filter((recipient) => recipient.kind === "conversation_owner_copy")
            .map((recipient) => String(recipient.id)),
        participantUserIds: recipients
            .filter((recipient) => recipient.kind === "participant")
            .map((recipient) => recipient.userId),
        outsideFixtureRecipientUserIds,
        recipientConversationCount: scopeCountRows.at(0)?.value ?? 0,
        deliveryAttemptIds: attempts.map((attempt) => String(attempt.id)),
        deliveryAttemptCount: attempts.length,
        deliveryAttemptOutcomeCounts,
        actionTokenCount: tokenCountRows.at(0)?.value ?? 0,
        providerMessageIds: [
            ...tests.flatMap((test) =>
                test.providerMessageId === null ? [] : [test.providerMessageId],
            ),
            ...attempts.flatMap((attempt) =>
                attempt.providerMessageId === null
                    ? []
                    : [attempt.providerMessageId],
            ),
        ],
        recipientOutcomeCounts,
    };
}

export function verifyExerciseReport({
    manifest,
    report,
}: {
    manifest: ExerciseManifest;
    report: ExerciseReport;
}): string[] {
    const database = report.database;
    const fixture = manifest.fixture;
    if (database === undefined || fixture === undefined) {
        return ["Database observation and fixture are required"];
    }
    const failures: string[] = [];
    const participantObservationsByOrdinal = new Map<
        number,
        ExerciseReport["provider"]["observations"]
    >();
    for (const observation of report.provider.observations) {
        if (
            observation.messageType !== "conversation_update" ||
            observation.participantOrdinal === undefined
        ) {
            continue;
        }
        const grouped =
            participantObservationsByOrdinal.get(
                observation.participantOrdinal,
            ) ?? [];
        grouped.push(observation);
        participantObservationsByOrdinal.set(
            observation.participantOrdinal,
            grouped,
        );
    }
    const participantIds = new Set(
        manifest.plan.identities.map((identity) => identity.userId),
    );
    const observedParticipantIds = new Set(database.participantUserIds);
    if (
        database.materializedParticipantCount !==
            manifest.plan.participantCount ||
        observedParticipantIds.size !== participantIds.size ||
        [...participantIds].some(
            (userId) => !observedParticipantIds.has(userId),
        )
    ) {
        failures.push(
            "Materialized participants do not exactly match the fixture",
        );
    }
    if (database.outsideFixtureRecipientUserIds.length > 0) {
        failures.push(
            "Delivery includes a recipient outside fixture participants and authorized owners",
        );
    }
    if (
        database.recipientConversationCount !==
        database.participantRecipientIds.length +
            database.ownerRecipientIds.length
    ) {
        failures.push("Recipient conversation scopes are incomplete");
    }
    if (
        database.ownerRecipientIds.length !== database.requiredOwnerCopyCount ||
        database.requiredOwnerCopyCount < 1
    ) {
        failures.push("Required owner-copy materialization is incomplete");
    }
    if (
        !Object.hasOwn(database.testAttemptStatuses, "provider_accepted") ||
        database.testAttemptStatuses.provider_accepted < 1
    ) {
        failures.push("No test message reached provider_accepted");
    }
    const expectedTerminal =
        manifest.plan.scenario === "owner_permanent_rejection"
            ? "failed"
            : manifest.plan.scenario === "mixed_participant_outcomes"
              ? "completed_with_failures"
              : manifest.plan.scenario === "kill_switch"
                ? "stopped"
                : "completed";
    if (database.deliveryStatus !== expectedTerminal) {
        failures.push(
            `Expected delivery status ${expectedTerminal}, observed ${database.deliveryStatus}`,
        );
    }
    if (
        manifest.plan.scenario === "owner_permanent_rejection" &&
        database.deliveryFailureReason !== "required_owner_copy_not_accepted"
    ) {
        failures.push("Owner rejection did not close the owner gate");
    }
    if (
        manifest.plan.scenario === "kill_switch" &&
        database.deliveryStopReason !== "global_kill_switch"
    ) {
        failures.push(
            "Kill-switch delivery did not record the global stop reason",
        );
    }
    const observedUpdateIds = new Set(
        report.provider.observations.map((observation) => observation.updateId),
    );
    if (
        observedUpdateIds.size !== 1 ||
        !observedUpdateIds.has(database.updateId)
    ) {
        failures.push("Provider calls do not identify the observed update");
    }
    const providerRecipientIds = new Set(
        report.provider.observations.flatMap((observation) =>
            observation.recipientId === undefined
                ? []
                : [observation.recipientId],
        ),
    );
    const databaseAttemptedRecipientIds = new Set([
        ...database.participantRecipientIds.filter((recipientId) =>
            providerRecipientIds.has(recipientId),
        ),
        ...database.ownerRecipientIds.filter((recipientId) =>
            providerRecipientIds.has(recipientId),
        ),
    ]);
    if (
        providerRecipientIds.size !== databaseAttemptedRecipientIds.size ||
        [...providerRecipientIds].some(
            (recipientId) => !databaseAttemptedRecipientIds.has(recipientId),
        )
    ) {
        failures.push(
            "Provider recipient IDs do not match observed recipients",
        );
    }
    const acceptedProviderIds = report.provider.observations.flatMap(
        (observation) =>
            observation.providerMessageId === undefined
                ? []
                : [observation.providerMessageId],
    );
    const databaseProviderMessageIds = new Set(database.providerMessageIds);
    if (
        acceptedProviderIds.length !== database.providerMessageIds.length ||
        new Set(acceptedProviderIds).size !==
            new Set(database.providerMessageIds).size ||
        acceptedProviderIds.some(
            (messageId) => !databaseProviderMessageIds.has(messageId),
        )
    ) {
        failures.push("Provider message IDs do not match durable attempt rows");
    }
    if (
        database.deliveryAttemptCount !==
        report.provider.observations.filter(
            (observation) => observation.messageType === "conversation_update",
        ).length
    ) {
        failures.push("Durable delivery attempts do not match provider calls");
    }
    const testObservations = report.provider.observations.filter(
        (observation) => observation.messageType === "conversation_update_test",
    );
    if (
        database.testAttemptIds.length !== testObservations.length ||
        database.testAttemptStatuses.provider_accepted !==
            testObservations.length
    ) {
        failures.push(
            "Durable test attempts do not match accepted test messages",
        );
    }
    const expectedActionTokenCount =
        report.provider.observations.filter(
            (observation) => observation.messageType === "conversation_update",
        ).length * 3;
    if (database.actionTokenCount !== expectedActionTokenCount) {
        failures.push("Recipient action-token count is incorrect");
    }
    const aggregateFromObservations = {
        sendCalls: report.provider.observations.length,
        providerAccepted: report.provider.observations.filter(
            (observation) => observation.outcome === "provider_accepted",
        ).length,
        retryableRejected: report.provider.observations.filter(
            (observation) => observation.outcome === "retryable_rejected",
        ).length,
        permanentRejected: report.provider.observations.filter(
            (observation) => observation.outcome === "permanent_rejected",
        ).length,
        unknown: report.provider.observations.filter(
            (observation) => observation.outcome === "unknown",
        ).length,
    };
    if (
        report.provider.aggregate.sendCalls !==
            aggregateFromObservations.sendCalls ||
        report.provider.aggregate.providerAccepted !==
            aggregateFromObservations.providerAccepted ||
        report.provider.aggregate.retryableRejected !==
            aggregateFromObservations.retryableRejected ||
        report.provider.aggregate.permanentRejected !==
            aggregateFromObservations.permanentRejected ||
        report.provider.aggregate.unknown !== aggregateFromObservations.unknown
    ) {
        failures.push(
            "Provider aggregate does not match provider observations",
        );
    }
    for (const outcome of [
        "provider_accepted",
        "retryable_rejected",
        "permanent_rejected",
        "unknown",
    ]) {
        const expectedCount = report.provider.observations.filter(
            (observation) =>
                observation.messageType === "conversation_update" &&
                observation.outcome === outcome,
        ).length;
        const observedCount = Object.hasOwn(
            database.deliveryAttemptOutcomeCounts,
            outcome,
        )
            ? database.deliveryAttemptOutcomeCounts[outcome]
            : 0;
        if (observedCount !== expectedCount) {
            failures.push(`Delivery attempt outcome ${outcome} is incorrect`);
        }
    }
    for (const identity of manifest.plan.identities) {
        const observations =
            participantObservationsByOrdinal.get(identity.ordinal) ?? [];
        const expectedOutcomes =
            manifest.plan.scenario === "kill_switch"
                ? []
                : identity.cohort === "participant_retry"
                  ? ["retryable_rejected", "provider_accepted"]
                  : identity.cohort === "participant_permanent_failure"
                    ? ["permanent_rejected"]
                    : ["provider_accepted"];
        if (
            observations.length !== expectedOutcomes.length ||
            observations.some(
                (observation, index) =>
                    observation.outcome !== expectedOutcomes[index],
            )
        ) {
            failures.push(
                `Participant ${String(identity.ordinal)} provider outcomes are incorrect`,
            );
        }
    }
    const ownerObservations = report.provider.observations.filter(
        (observation) => observation.recipientKind === "owner_copy",
    );
    const expectedOwnerOutcome =
        manifest.plan.scenario === "owner_permanent_rejection"
            ? "permanent_rejected"
            : "provider_accepted";
    if (
        ownerObservations.length !== database.requiredOwnerCopyCount ||
        ownerObservations.some(
            (observation) => observation.outcome !== expectedOwnerOutcome,
        )
    ) {
        failures.push("Owner-copy provider outcomes are incorrect");
    }
    const expectedParticipantStatuses: Record<string, number> = {};
    if (manifest.plan.scenario === "owner_permanent_rejection") {
        expectedParticipantStatuses.pending = manifest.plan.participantCount;
    } else if (manifest.plan.scenario === "kill_switch") {
        expectedParticipantStatuses.skipped = manifest.plan.participantCount;
    } else if (manifest.plan.scenario === "mixed_participant_outcomes") {
        expectedParticipantStatuses.provider_accepted =
            manifest.plan.identities.filter(
                (identity) =>
                    identity.cohort !== "participant_permanent_failure",
            ).length;
        expectedParticipantStatuses.permanent_failed =
            manifest.plan.identities.filter(
                (identity) =>
                    identity.cohort === "participant_permanent_failure",
            ).length;
    } else {
        expectedParticipantStatuses.provider_accepted =
            manifest.plan.participantCount;
    }
    const expectedRecipientStatusCounts: Record<string, number> = {
        ...expectedParticipantStatuses,
    };
    const ownerStatus =
        expectedOwnerOutcome === "permanent_rejected"
            ? "permanent_failed"
            : "provider_accepted";
    expectedRecipientStatusCounts[ownerStatus] =
        (Object.hasOwn(expectedRecipientStatusCounts, ownerStatus)
            ? expectedRecipientStatusCounts[ownerStatus]
            : 0) + database.requiredOwnerCopyCount;
    const recipientStatuses = new Set([
        ...Object.keys(expectedRecipientStatusCounts),
        ...Object.keys(database.recipientOutcomeCounts),
    ]);
    for (const status of recipientStatuses) {
        if (
            database.recipientOutcomeCounts[status] !==
            expectedRecipientStatusCounts[status]
        ) {
            failures.push(`Recipient status ${status} has an incorrect count`);
        }
    }
    return failures;
}

export function resolveOwnedUpdateEvidence({
    providerUpdateIds,
    recipientUpdateIds,
}: {
    providerUpdateIds: readonly number[];
    recipientUpdateIds: readonly number[];
}): number | undefined {
    const uniqueProviderUpdateIds = [...new Set(providerUpdateIds)];
    const uniqueRecipientUpdateIds = [...new Set(recipientUpdateIds)];
    if (uniqueProviderUpdateIds.length > 1) {
        throw new Error(
            "Refusing cleanup because provider observations identify multiple updates",
        );
    }
    if (uniqueRecipientUpdateIds.length > 1) {
        throw new Error(
            "Refusing cleanup because fixture recipients identify multiple updates",
        );
    }
    const providerUpdateId = uniqueProviderUpdateIds.at(0);
    const recipientUpdateId = uniqueRecipientUpdateIds.at(0);
    if (
        providerUpdateId !== undefined &&
        recipientUpdateId !== undefined &&
        providerUpdateId !== recipientUpdateId
    ) {
        throw new Error(
            "Refusing cleanup because provider and fixture-recipient evidence conflict",
        );
    }
    return providerUpdateId ?? recipientUpdateId;
}

function secondPrecision(value: Date): Date {
    return new Date(Math.floor(value.getTime() / 1_000) * 1_000);
}

function targetReservationParams({
    db,
    manifest,
}: {
    db: PostgresJsDatabase;
    manifest: ExerciseManifest;
}) {
    const fixture = manifest.fixture;
    if (fixture === undefined) {
        throw new Error("Target reservation requires a prepared fixture");
    }
    return {
        db,
        conversationId: fixture.conversationId,
        namespace: manifest.plan.namespace,
        fixtureId: manifest.plan.fixtureId,
        markerValue: manifest.plan.databaseMarker,
    };
}

function targetReservationOwnerParams({
    db,
    plan,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
}) {
    return {
        db,
        namespace: plan.namespace,
        fixtureId: plan.fixtureId,
        markerValue: plan.databaseMarker,
    };
}

function fixturesMatch({
    left,
    right,
}: {
    left: PreparedExerciseFixture;
    right: PreparedExerciseFixture;
}): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}

async function validatePreparedFixture({
    db,
    plan,
    fixture,
}: {
    db: PostgresJsDatabase;
    plan: ExercisePlan;
    fixture: PreparedExerciseFixture;
}): Promise<void> {
    const target = await loadTarget({
        db,
        plan,
        expectedFixtureVoteIds: fixture.participantReferences.map(
            (reference) => reference.voteId,
        ),
    });
    if (
        target.projectId !== fixture.projectId ||
        target.projectSlug !== fixture.projectSlug ||
        target.conversationId !== fixture.conversationId ||
        target.conversationContentId !== fixture.conversationContentId ||
        target.conversationSlugId !== fixture.conversationSlugId ||
        target.opinionId !== fixture.opinionId ||
        target.opinionContentId !== fixture.opinionContentId
    ) {
        throw new Error(
            "Existing conversation target changed after fixture preparation",
        );
    }
    await validateFixtureRelationships({ db, plan, fixture });
}

async function reconcileCleanupManifest({
    tx,
    manifest,
}: {
    tx: PostgresJsDatabase;
    manifest: ExerciseManifest;
}): Promise<
    | { state: "unreserved" }
    | {
          state: "prepared" | "cleaned";
          manifest: ExerciseManifest & { fixture: PreparedExerciseFixture };
      }
> {
    const reservation = await readOwnedExerciseTargetReservation(
        targetReservationOwnerParams({ db: tx, plan: manifest.plan }),
    );
    if (reservation === undefined) {
        if (manifest.fixture !== undefined) {
            throw new Error(
                "Target conversation reservation does not match the guarded fixture",
            );
        }
        return { state: "unreserved" };
    }
    if (reservation.state === "preparing") {
        throw new Error("Target conversation reservation is incomplete");
    }
    if (
        manifest.fixture !== undefined &&
        !fixturesMatch({ left: manifest.fixture, right: reservation.fixture })
    ) {
        throw new Error(
            "Persisted target reservation fixture does not match the manifest",
        );
    }
    return {
        state: reservation.state,
        manifest: { ...manifest, fixture: reservation.fixture },
    };
}

async function discoverOwnedUpdateId({
    tx,
    manifest,
    report,
}: {
    tx: PostgresJsDatabase;
    manifest: ExerciseManifest;
    report: ExerciseReport | undefined;
}): Promise<number | undefined> {
    const fixture = manifest.fixture;
    if (fixture === undefined) return undefined;
    if (
        report !== undefined &&
        (report.namespace !== manifest.plan.namespace ||
            report.fixtureId !== manifest.plan.fixtureId)
    ) {
        throw new Error(
            "Refusing cleanup because the provider report does not belong to this fixture",
        );
    }
    const recipientUpdateIds = new Set<number>();
    for (const identityChunk of chunks(manifest.plan.identities)) {
        const rows = await tx
            .selectDistinct({
                updateId: conversationEmailUpdateDeliveryTable.updateId,
            })
            .from(conversationEmailUpdateRecipientTable)
            .innerJoin(
                conversationEmailUpdateDeliveryTable,
                eq(
                    conversationEmailUpdateDeliveryTable.id,
                    conversationEmailUpdateRecipientTable.deliveryId,
                ),
            )
            .where(
                inArray(
                    conversationEmailUpdateRecipientTable.userId,
                    identityChunk.map((identity) => identity.userId),
                ),
            );
        for (const row of rows) recipientUpdateIds.add(row.updateId);
    }
    const updateId = resolveOwnedUpdateEvidence({
        providerUpdateIds:
            report?.provider.observations.map(
                (observation) => observation.updateId,
            ) ?? [],
        recipientUpdateIds: [...recipientUpdateIds],
    });
    if (updateId === undefined) return undefined;

    const update = (
        await tx
            .select({
                id: conversationEmailUpdateTable.id,
                projectId: conversationEmailUpdateTable.projectId,
                createdAt: conversationEmailUpdateTable.createdAt,
            })
            .from(conversationEmailUpdateTable)
            .where(eq(conversationEmailUpdateTable.id, updateId))
            .limit(1)
            .for("update")
    ).at(0);
    if (update === undefined) {
        throw new Error(
            "Refusing cleanup because the evidenced update no longer exists",
        );
    }
    if (
        update.projectId !== fixture.projectId ||
        update.createdAt < secondPrecision(new Date(fixture.preparedAt))
    ) {
        throw new Error(
            "Refusing cleanup because the evidenced update is outside the frozen fixture boundary",
        );
    }
    const links = await tx
        .select({
            conversationId:
                conversationEmailUpdateConversationTable.conversationId,
        })
        .from(conversationEmailUpdateConversationTable)
        .where(
            eq(conversationEmailUpdateConversationTable.updateId, update.id),
        );
    if (
        links.length !== 1 ||
        links[0]?.conversationId !== fixture.conversationId
    ) {
        throw new Error(
            "Refusing cleanup because the candidate update is not exclusively linked to the target conversation",
        );
    }
    return update.id;
}

async function deleteOwnedUpdateArtifacts({
    tx,
    updateId,
}: {
    tx: PostgresJsDatabase;
    updateId: number;
}): Promise<void> {
    const deliveries = await tx
        .select({ id: conversationEmailUpdateDeliveryTable.id })
        .from(conversationEmailUpdateDeliveryTable)
        .where(eq(conversationEmailUpdateDeliveryTable.updateId, updateId));
    for (const deliveryChunk of chunks(deliveries)) {
        const deliveryIds = deliveryChunk.map((delivery) => delivery.id);
        const recipients = await tx
            .select({ id: conversationEmailUpdateRecipientTable.id })
            .from(conversationEmailUpdateRecipientTable)
            .where(
                inArray(
                    conversationEmailUpdateRecipientTable.deliveryId,
                    deliveryIds,
                ),
            );
        for (const recipientChunk of chunks(recipients)) {
            const recipientIds = recipientChunk.map(
                (recipient) => recipient.id,
            );
            await tx
                .delete(conversationEmailUpdateReportTable)
                .where(
                    inArray(
                        conversationEmailUpdateReportTable.recipientId,
                        recipientIds,
                    ),
                );
            await tx
                .delete(conversationEmailUpdateActionTokenTable)
                .where(
                    inArray(
                        conversationEmailUpdateActionTokenTable.recipientId,
                        recipientIds,
                    ),
                );
            await tx
                .delete(conversationEmailUpdateDeliveryAttemptTable)
                .where(
                    inArray(
                        conversationEmailUpdateDeliveryAttemptTable.recipientId,
                        recipientIds,
                    ),
                );
            await tx
                .delete(conversationEmailUpdateRecipientConversationTable)
                .where(
                    inArray(
                        conversationEmailUpdateRecipientConversationTable.recipientId,
                        recipientIds,
                    ),
                );
            await tx
                .delete(conversationEmailUpdateRecipientTable)
                .where(
                    inArray(
                        conversationEmailUpdateRecipientTable.id,
                        recipientIds,
                    ),
                );
        }
        await tx
            .delete(conversationEmailUpdateDeliveryTable)
            .where(
                inArray(conversationEmailUpdateDeliveryTable.id, deliveryIds),
            );
    }
    await tx
        .delete(conversationEmailUpdateTestAttemptTable)
        .where(eq(conversationEmailUpdateTestAttemptTable.updateId, updateId));
    await tx
        .delete(conversationEmailUpdateConversationTable)
        .where(eq(conversationEmailUpdateConversationTable.updateId, updateId));
    await tx
        .delete(conversationEmailUpdateTable)
        .where(eq(conversationEmailUpdateTable.id, updateId));
}

async function deleteFixtureParticipants({
    tx,
    manifest,
}: {
    tx: PostgresJsDatabase;
    manifest: ExerciseManifest;
}): Promise<void> {
    const fixture = manifest.fixture;
    if (fixture === undefined) return;
    for (const referenceChunk of chunks(fixture.participantReferences)) {
        const userIds = referenceChunk.map((reference) => reference.userId);
        const voteIds = referenceChunk.map((reference) => reference.voteId);
        const voteContentIds = referenceChunk.map(
            (reference) => reference.voteContentId,
        );
        const emailIds = referenceChunk.map((reference) => reference.emailId);
        await tx
            .update(voteTable)
            .set({ currentContentId: null })
            .where(inArray(voteTable.id, voteIds));
        await tx
            .delete(voteContentTable)
            .where(inArray(voteContentTable.id, voteContentIds));
        await tx.delete(voteTable).where(inArray(voteTable.id, voteIds));
        await tx
            .delete(conversationEmailUpdateUserConversationPreferenceTable)
            .where(
                and(
                    inArray(
                        conversationEmailUpdateUserConversationPreferenceTable.userId,
                        userIds,
                    ),
                    eq(
                        conversationEmailUpdateUserConversationPreferenceTable.conversationId,
                        fixture.conversationId,
                    ),
                ),
            );
        await tx
            .delete(conversationEmailUpdateUserProjectPreferenceTable)
            .where(
                and(
                    inArray(
                        conversationEmailUpdateUserProjectPreferenceTable.userId,
                        userIds,
                    ),
                    eq(
                        conversationEmailUpdateUserProjectPreferenceTable.projectId,
                        fixture.projectId,
                    ),
                ),
            );
        await tx.delete(emailTable).where(inArray(emailTable.id, emailIds));
        await tx
            .delete(userDisplayLanguageTable)
            .where(inArray(userDisplayLanguageTable.userId, userIds));
        await tx.delete(userTable).where(inArray(userTable.id, userIds));
    }
}

export function createExistingConversationFixtureStore({
    db,
}: {
    db: PostgresJsDatabase;
}): FixtureStore {
    return {
        prepare: async (plan) => {
            await assertDatabaseName({
                db,
                expectedDatabaseName: plan.expectedDatabaseName,
            });
            return await db.transaction(async (tx) => {
                const existingReservation =
                    await readOwnedExerciseTargetReservation(
                        targetReservationOwnerParams({ db: tx, plan }),
                    );
                if (existingReservation !== undefined) {
                    if (existingReservation.state !== "prepared") {
                        throw new Error(
                            "Target conversation reservation is not available for prepare recovery",
                        );
                    }
                    await validatePreparedFixture({
                        db: tx,
                        plan,
                        fixture: existingReservation.fixture,
                    });
                    return existingReservation.fixture;
                }
                const target = await loadTarget({
                    db: tx,
                    plan,
                    expectedFixtureVoteIds: undefined,
                });
                await assertNamespaceAvailable({ db: tx, plan });
                await acquireExerciseTargetReservation({
                    db: tx,
                    conversationId: target.conversationId,
                    namespace: plan.namespace,
                    fixtureId: plan.fixtureId,
                    markerValue: plan.databaseMarker,
                });
                const fixtureWithoutReferences: Omit<
                    PreparedExerciseFixture,
                    "participantReferences"
                > = {
                    ...target,
                    preparedAt: secondPrecision(new Date()).toISOString(),
                    participantCount: plan.participantCount,
                };
                const participantReferences = await seedParticipants({
                    db: tx,
                    plan,
                    fixture: fixtureWithoutReferences,
                });
                const fixture = {
                    ...fixtureWithoutReferences,
                    participantReferences,
                };
                await markExerciseTargetReservationPrepared({
                    db: tx,
                    conversationId: target.conversationId,
                    namespace: plan.namespace,
                    fixtureId: plan.fixtureId,
                    markerValue: plan.databaseMarker,
                    fixture,
                });
                return fixture;
            });
        },
        attach: async ({ manifest, fixture }) => {
            await assertDatabaseName({
                db,
                expectedDatabaseName: manifest.plan.expectedDatabaseName,
            });
            const reservation = await assertExerciseTargetReservation(
                targetReservationParams({ db, manifest }),
            );
            if (
                reservation.state !== "prepared" ||
                !fixturesMatch({ left: fixture, right: reservation.fixture })
            ) {
                throw new Error(
                    "Persisted target reservation fixture does not match the manifest",
                );
            }
            await validatePreparedFixture({
                db,
                plan: manifest.plan,
                fixture,
            });
        },
        observe: async ({ manifest, report }) => {
            await assertDatabaseName({
                db,
                expectedDatabaseName: manifest.plan.expectedDatabaseName,
            });
            return await observeDatabase({ db, manifest, report });
        },
        verify: async ({ manifest, report }) => {
            if (manifest.fixture === undefined) {
                return ["Manifest has no fixture"];
            }
            await validateFixtureRelationships({
                db,
                plan: manifest.plan,
                fixture: manifest.fixture,
            });
            return verifyExerciseReport({ manifest, report });
        },
        cleanup: async ({ manifest, report }) => {
            await assertDatabaseName({
                db,
                expectedDatabaseName: manifest.plan.expectedDatabaseName,
            });
            await db.transaction(async (tx) => {
                await tx.execute(
                    sql`select pg_advisory_xact_lock(hashtextextended(${manifest.plan.namespace}, 0))`,
                );
                const reconciled = await reconcileCleanupManifest({
                    tx,
                    manifest,
                });
                const existingRows = await tx
                    .select({ id: userTable.id })
                    .from(userTable)
                    .where(
                        inArray(
                            userTable.id,
                            manifest.plan.identities.map(
                                (identity) => identity.userId,
                            ),
                        ),
                    );
                if (reconciled.state === "unreserved") {
                    if (existingRows.length === 0) return;
                    throw new Error(
                        "Refusing cleanup because fixture namespace ownership is incomplete",
                    );
                }
                if (reconciled.state === "cleaned") {
                    if (existingRows.length !== 0) {
                        throw new Error(
                            "Refusing cleanup because a cleaned reservation still has fixture participants",
                        );
                    }
                    return;
                }
                const cleanupManifest = reconciled.manifest;
                const reservationParams = targetReservationParams({
                    db: tx,
                    manifest: cleanupManifest,
                });
                const reservation =
                    await assertExerciseTargetReservation(reservationParams);
                if (
                    reservation.state !== "prepared" ||
                    !fixturesMatch({
                        left: cleanupManifest.fixture,
                        right: reservation.fixture,
                    })
                ) {
                    throw new Error(
                        "Persisted target reservation fixture does not match the manifest",
                    );
                }
                if (existingRows.length > 0) {
                    if (
                        existingRows.length !==
                        cleanupManifest.plan.participantCount
                    ) {
                        throw new Error(
                            "Refusing cleanup because fixture namespace ownership is incomplete",
                        );
                    }
                    await validateFixtureRelationships({
                        db: tx,
                        plan: cleanupManifest.plan,
                        fixture: cleanupManifest.fixture,
                    });
                }
                const ownedUpdateId = await discoverOwnedUpdateId({
                    tx,
                    manifest: cleanupManifest,
                    report,
                });
                if (ownedUpdateId !== undefined) {
                    await deleteOwnedUpdateArtifacts({
                        tx,
                        updateId: ownedUpdateId,
                    });
                }
                if (existingRows.length > 0) {
                    await deleteFixtureParticipants({
                        tx,
                        manifest: cleanupManifest,
                    });
                }
                await markExerciseTargetReservationCleaned(reservationParams);
            });
        },
        finalizeCleanup: async (manifest) => {
            await assertDatabaseName({
                db,
                expectedDatabaseName: manifest.plan.expectedDatabaseName,
            });
            await finalizeExerciseTargetReservation(
                targetReservationOwnerParams({ db, plan: manifest.plan }),
            );
        },
    };
}
