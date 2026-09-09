import { PgDialect } from "drizzle-orm/pg-core";
import {
    PostgresJsPreparedQuery,
    PostgresJsSession,
    PostgresJsTransaction,
} from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { afterEach, describe, expect, it, vi } from "vitest";
import { EMAIL_TEMPLATE_VERSION } from "@/generated/email/render.js";
import {
    authorizeRecipientSend,
    claimTestAttempts,
    markTestAttempting,
    parseConversationEmailBranding,
    toAuthorizedConversation,
    type ClaimedTestWork,
} from "./store.js";

const clients: ReturnType<typeof postgres>[] = [];

function database() {
    const client = postgres("postgresql://postgres@127.0.0.1:1/not-used");
    clients.push(client);
    const transactionClient = Object.assign(client, {
        savepoint: () => Promise.reject(new Error("Unexpected savepoint")),
        prepare: () => Promise.reject(new Error("Unexpected prepare")),
    });
    const dialect = new PgDialect();
    const session = new PostgresJsSession<
        typeof transactionClient,
        Record<string, never>,
        Record<string, never>
    >(transactionClient, dialect, undefined);
    const db = new PostgresJsTransaction(dialect, session, undefined);
    vi.spyOn(db, "transaction").mockImplementation(
        async (run) => await run(db),
    );
    const queries = vi.spyOn(session, "prepareQuery");
    const execute = vi.spyOn(PostgresJsPreparedQuery.prototype, "execute");
    return { db, queries, execute };
}

const work: ClaimedTestWork = {
    id: 1,
    publicId: "test-public-id",
    leaseToken: "lease-token",
    updateId: 2,
    destinationEmail: "owner@example.com",
    destinationEmailCredentialId: 3,
    requestedByUserId: "owner-id",
    subject: "Reviewed subject",
    bodyHtml: "<p>Reviewed body</p>",
    bodyPlainText: "Reviewed body",
    projectTitle: "Reviewed project",
    branding: { name: "Reviewed project", palette: "green" },
    templateVersion: EMAIL_TEMPLATE_VERSION,
    replyToName: "Reviewed contact",
    replyToEmail: "contact@example.com",
    language: "fr",
};

afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.all(
        clients.splice(0).map(async (client) => {
            await client.end({ timeout: 0 });
        }),
    );
});

describe("immutable review store", () => {
    it("locks cancellation's update row before final authorization and attempting", async () => {
        const { db, queries, execute } = database();
        execute
            .mockResolvedValueOnce([{ id: 2 }])
            .mockResolvedValueOnce([{ id: 1 }])
            .mockResolvedValueOnce([{ id: 1 }]);

        expect(await markTestAttempting({ db, work, leaseSeconds: 120 })).toBe(
            true,
        );
        const statements = queries.mock.calls.map(([query]) => query);
        expect(statements[0]?.sql).toContain(
            'from "conversation_email_update"',
        );
        expect(statements[0]?.sql).toContain("for update");
        expect(statements[0]?.params).toEqual([work.updateId]);
        const authorization = statements.at(1);
        expect(authorization?.sql).toContain('"cancelled_at" is null');
        expect(authorization?.sql).toContain(
            '"review_test_email_credential_id" is not null',
        );
        expect(authorization?.sql).toContain(
            '"destination_email_credential_id" = "conversation_email_update"."review_test_email_credential_id"',
        );
        expect(authorization?.sql).toContain(
            '"destination_email_snapshot" = "conversation_email_update"."review_test_email_snapshot"',
        );
        expect(authorization?.sql).toContain(
            '"review_expires_at" > clock_timestamp()',
        );
        expect(authorization?.sql).toContain(
            '"premium_feature_entitlement"."starts_at" <= clock_timestamp()',
        );
        expect(authorization?.sql).toContain(
            '"premium_feature_entitlement"."expires_at" > clock_timestamp()',
        );
        expect(authorization?.sql).toContain(
            '"conversation_email_update_test_attempt"."lease_expires_at" > clock_timestamp()',
        );
        expect(authorization?.sql).not.toContain("now()");
        expect(authorization?.sql).not.toContain("review_language");
        expect(authorization?.params).toContain(EMAIL_TEMPLATE_VERSION);
        expect(authorization?.sql).not.toContain("is distinct from");
        expect(authorization?.sql).not.toContain("not coalesce");
        expect(authorization?.params).toContain("listed_project");
        expect(authorization?.params).toContain("conversation");
        expect(authorization?.sql).toContain(
            '"conversation_email_update_enabled_override"',
        );
        expect(authorization?.sql).toContain('"reply_to_email_snapshot"');
        expect(authorization?.sql).toContain('"reply_to_name_snapshot"');
        expect(authorization?.sql).toContain(
            '"authorizing_premium_feature_id"',
        );
        expect(authorization?.sql).toContain(
            '"destination_email_credential_id"',
        );
        const transition = statements.at(2);
        expect(transition?.params).toContain("attempting");
        expect(transition?.sql).toContain(
            '"authorized_at" = clock_timestamp()',
        );
        expect(transition?.sql).toMatch(
            /"lease_expires_at" = clock_timestamp\(\) \+ \$\d+ \* interval '1 second'/u,
        );
        expect(transition?.params).toContain(120);
        expect(transition?.sql).toContain(
            '"conversation_email_update_test_attempt"."lease_expires_at" > clock_timestamp()',
        );
        expect(transition?.sql).not.toContain("now()");
    });

    it("does not transition a claimed test when the locked review authorization fails", async () => {
        const { db, queries, execute } = database();
        execute
            .mockResolvedValueOnce([{ id: 2 }])
            .mockResolvedValueOnce([])
            .mockResolvedValueOnce([]);
        expect(await markTestAttempting({ db, work, leaseSeconds: 120 })).toBe(
            false,
        );
        expect(
            queries.mock.calls.flatMap(([query]) => query.params),
        ).not.toContain("attempting");
        expect(queries.mock.calls.at(-1)?.[0].params).toContain(
            "permanent_rejected",
        );
        expect(queries.mock.calls.at(-1)?.[0].params).toContain("claimed");
        const rejection = queries.mock.calls.at(-1)?.[0].sql;
        expect(rejection).toContain('"authorized_at" = clock_timestamp()');
        expect(rejection).toContain('"finished_at" = clock_timestamp()');
        expect(rejection).not.toContain("now()");
    });

    it("does not mark attempting when the lease is lost after final authorization", async () => {
        const { db, queries, execute } = database();
        execute
            .mockResolvedValueOnce([{ id: 2 }])
            .mockResolvedValueOnce([{ id: 1 }])
            .mockResolvedValueOnce([]);
        expect(await markTestAttempting({ db, work, leaseSeconds: 120 })).toBe(
            false,
        );
        expect(queries.mock.calls.at(-1)?.[0].sql).toContain(
            '"conversation_email_update_test_attempt"."lease_expires_at" > clock_timestamp()',
        );
    });

    it.each([
        { userLanguage: "ar", expected: "ar" },
        { userLanguage: null, expected: "en" },
    ])(
        "claims current account language or default $expected instead of prior work language",
        async ({ userLanguage, expected }) => {
            const { db, queries, execute } = database();
            execute
                .mockResolvedValueOnce([{ id: 1 }])
                .mockResolvedValueOnce([{ id: 1 }])
                .mockResolvedValueOnce([
                    {
                        ...work,
                        userLanguage,
                        brandingSnapshot: work.branding,
                    },
                ]);
            const claimed = await claimTestAttempts({
                db,
                workerId: "test",
                batchSize: 1,
                leaseSeconds: 120,
            });
            expect(claimed[0]?.language).toBe(expected);
            expect(claimed[0]?.language).not.toBe(work.language);
            expect(claimed[0]?.branding).toEqual(work.branding);
            const statements = queries.mock.calls
                .map(([query]) => query.sql)
                .join("\n");
            expect(statements).not.toContain("review_language");
            expect(queries.mock.calls.at(-1)?.[0].sql).toContain(
                'left join "user_display_language"',
            );
            expect(queries.mock.calls.at(-1)?.[0].sql).toContain(
                '"user_display_language"."language_code"',
            );
            expect(queries.mock.calls.at(-1)?.[0].sql).not.toContain(
                "coalesce",
            );
        },
    );

    it.each(
        [null, EMAIL_TEMPLATE_VERSION].flatMap((templateVersion) => [
            {
                templateVersion,
                kind: "participant",
                participantPreferenceScope: "project",
            },
            {
                templateVersion,
                kind: "participant",
                participantPreferenceScope: "conversation",
            },
            {
                templateVersion,
                kind: "conversation_owner_copy",
                participantPreferenceScope: "project",
            },
            {
                templateVersion,
                kind: "conversation_owner_copy",
                participantPreferenceScope: "conversation",
            },
        ]),
    )(
        "preserves accepted $kind deliveries and purpose tokens for $participantPreferenceScope scope, template $templateVersion",
        async ({ templateVersion, kind, participantPreferenceScope }) => {
            const { db, queries, execute } = database();
            const recipient = {
                recipientId: 4n,
                deliveryId: 5,
                updateId: work.updateId,
                to: "participant@example.com",
                emailCredentialId: 6,
                userId: "participant-id",
                language: "en",
                kind,
                attemptCount: 0,
                subject: work.subject,
                bodyHtml: work.bodyHtml,
                bodyPlainText: work.bodyPlainText,
                projectTitle: work.projectTitle,
                brandingSnapshot:
                    templateVersion === null ? null : work.branding,
                templateVersion,
                replyToName: work.replyToName,
                replyToEmail: work.replyToEmail,
                projectId: 7,
                authorizingOrganizationId: 8,
                participantPreferenceScope,
                createdByUserId: work.requestedByUserId,
                reviewExpiresAt: new Date(0),
            };
            execute
                .mockResolvedValueOnce([{ id: 5 }])
                .mockResolvedValueOnce([recipient])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([{ id: recipient.userId }]);
            if (kind === "conversation_owner_copy") {
                execute.mockResolvedValueOnce([{ organizationId: 8 }]);
            }
            execute
                .mockResolvedValueOnce([{ id: 6 }])
                .mockResolvedValueOnce([])
                .mockResolvedValueOnce([]);
            if (kind === "participant") {
                execute.mockResolvedValueOnce([]);
            }
            execute.mockResolvedValueOnce([
                {
                    conversationId: 9,
                    title: "Reviewed conversation",
                    slugId: "changed",
                    projectSlug: "changed-project",
                    autoProvisionedForOrganizationId: null,
                    templateVersion,
                    conversationUrlSnapshot:
                        templateVersion === null
                            ? null
                            : "https://reviewed.example/exact/path/?a=b",
                },
            ]);
            if (kind === "participant") {
                execute.mockResolvedValueOnce([]);
            }
            execute.mockResolvedValueOnce([{ id: 4n }]).mockResolvedValue([]);
            const authorized = await authorizeRecipientSend({
                db,
                claimed: {
                    id: 4n,
                    deliveryId: 5,
                    leaseToken: "recipient-lease",
                },
                siteBaseUrl: "https://current.example",
                leaseSeconds: 120,
            });
            expect(authorized?.branding).toEqual(
                templateVersion === null
                    ? { name: work.projectTitle, palette: "blue" }
                    : work.branding,
            );
            expect(authorized?.templateVersion).toBe(templateVersion);
            expect(authorized?.conversations[0].url).toBe(
                templateVersion === null
                    ? "https://current.example/project/changed-project/conversation/changed/"
                    : "https://reviewed.example/exact/path/?a=b",
            );
            const sql = queries.mock.calls
                .map(([query]) => query.sql)
                .join("\n");
            expect(sql).not.toContain('"review_expires_at"');
            expect(sql).not.toContain('"cancelled_at"');
            expect(authorized?.kind).toBe(kind);
            const tokenInserts = queries.mock.calls
                .map(([query]) => query)
                .filter((query) =>
                    query.sql.startsWith(
                        'insert into "conversation_email_update_action_token"',
                    ),
                );
            expect(tokenInserts).toHaveLength(1);
            const tokenParams = tokenInserts.flatMap((query) => query.params);
            const expectedActions =
                kind === "participant"
                    ? [
                          "report",
                          `unsubscribe_${participantPreferenceScope}`,
                          "manage_preferences",
                      ]
                    : ["report"];
            expect(
                tokenParams.filter((param) =>
                    [
                        "report",
                        "unsubscribe_project",
                        "unsubscribe_conversation",
                        "manage_preferences",
                    ].includes(String(param)),
                ),
            ).toEqual(expectedActions);
            const hashes = Object.values(authorized?.actionTokens ?? {});
            expect(hashes).toHaveLength(expectedActions.length);
            const persistedHashes = tokenParams.filter(
                (param) =>
                    typeof param === "string" && /^[a-f0-9]{64}$/.test(param),
            );
            expect(persistedHashes).toHaveLength(hashes.length);
            expect(persistedHashes).toEqual(expect.arrayContaining(hashes));
            expect(
                tokenParams.filter(
                    (param) => param === authorized?.attemptPublicId,
                ),
            ).toHaveLength(expectedActions.length);
        },
    );

    it("parses stored branding and only supplies fallback branding for legacy rows", () => {
        expect(
            parseConversationEmailBranding({
                brandingSnapshot: work.branding,
                templateVersion: EMAIL_TEMPLATE_VERSION,
                projectTitle: "Changed",
            }),
        ).toEqual(work.branding);
        expect(
            parseConversationEmailBranding({
                brandingSnapshot: null,
                templateVersion: null,
                projectTitle: "Legacy",
            }),
        ).toEqual({ name: "Legacy", palette: "blue" });
        for (const brandingSnapshot of [
            null,
            { name: "Bad", palette: "red" },
            { name: "Bad", palette: "blue", imageUrl: "invalid" },
        ]) {
            expect(
                parseConversationEmailBranding({
                    brandingSnapshot,
                    templateVersion: EMAIL_TEMPLATE_VERSION,
                    projectTitle: "No fallback",
                }),
            ).toBeUndefined();
        }
    });

    it("preserves exact stored URLs and refuses to reconstruct missing reviewed URLs", () => {
        const conversation = {
            conversationId: 9,
            title: "Snapshot title",
            slugId: "changed",
            projectSlug: "changed",
            autoProvisionedForOrganizationId: null,
            baseUrl: new URL("https://changed.example"),
            templateVersion: EMAIL_TEMPLATE_VERSION,
        };
        const url = "https://reviewed.example/exact/%2f/?x=1&y=2";
        expect(
            toAuthorizedConversation({
                ...conversation,
                conversationUrlSnapshot: url,
            }).url,
        ).toBe(url);
        expect(() =>
            toAuthorizedConversation({
                ...conversation,
                conversationUrlSnapshot: null,
            }),
        ).toThrow("URL snapshot");
    });
});
