import { and, eq, sql } from "drizzle-orm";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import {
    afterAll,
    beforeAll,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from "vitest";
import {
    conversationTable,
    opinionTable,
    organizationMembershipAllProjectCapabilityTable,
    organizationMembershipTable,
    organizationTable,
    projectDocumentFileTable,
    projectDocumentLocalizationTable,
    projectDocumentTable,
    projectOrganizationOwnershipTable,
    projectTable,
    userTable,
    voteTable,
} from "../src/shared-backend/schema.js";
import {
    accessProjectDocument,
    fetchProjectPageDocuments,
    uploadProjectDocument,
} from "../src/service/projectDocument.js";
import type { generatePresignedUrl } from "../src/service/s3.js";
import type { AccessProjectDocumentRequest } from "../src/shared/types/dto.js";
import { readDbFixtureSql } from "./dbFixture.js";

const signUrl = vi.hoisted(() => vi.fn<typeof generatePresignedUrl>());
vi.mock("../src/service/s3.js", () => ({
    generatePresignedUrl: signUrl,
    uploadToS3: vi.fn(),
    deleteFromS3: vi.fn(),
}));
vi.mock("../src/app.js", () => ({
    config: {
        PROJECT_DOCUMENTS_AWS_S3_BUCKET_NAME: "test-project-documents",
        PROJECT_DOCUMENTS_AWS_S3_REGION: "eu-west-1",
        PROJECT_DOCUMENTS_S3_PRESIGNED_URL_EXPIRY_SECONDS: 600,
    },
    log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

process.env.TESTCONTAINERS_RYUK_DISABLED ??= "true";
const OWNER = "00000000-0000-4000-8000-000000000001";
const PARTICIPANT = "00000000-0000-4000-8000-000000000002";
const STRANGER = "00000000-0000-4000-8000-000000000003";
const DOCUMENT = "00000000-0000-4000-8000-000000000101";
const PARTICIPANT_ONLY_DOCUMENT = "00000000-0000-4000-8000-000000000102";

function firstRow<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing test fixture row");
    return row;
}

describe("project document version authorization", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;
    let projectId: number;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "agora_test",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: "agora_test",
            username: "postgres",
            password: "postgres",
        });
        db = drizzle(client);
        await db.execute(sql.raw(readDbFixtureSql("project-documents.sql")));
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    beforeEach(async () => {
        await db.execute(sql`TRUNCATE maxdiff_comparison, maxdiff_result, vote,
            opinion_moderation, opinion, conversation, project_document_localization,
            project_document_file, project_document, project_organization_ownership,
            organization_membership_all_project_capability, organization_membership,
            project, organization, "user" RESTART IDENTITY CASCADE`);
        signUrl.mockReset();
        signUrl.mockImplementation(({ s3Key }) =>
            Promise.resolve({
                url: `https://documents.example.com/${s3Key}`,
                expiresAt: new Date("2099-01-01"),
            }),
        );
        await db.insert(userTable).values([
            { id: OWNER, username: "owner" },
            { id: PARTICIPANT, username: "participant" },
            { id: STRANGER, username: "stranger" },
        ]);
        const organization = firstRow(
            await db
                .insert(organizationTable)
                .values({
                    slug: "project-owner",
                    displayName: "Project owner",
                    isFullImagePath: false,
                    defaultLanguageCode: "en",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        const membership = firstRow(
            await db
                .insert(organizationMembershipTable)
                .values({ userId: OWNER, organizationId: organization.id })
                .returning(),
        );
        await db
            .insert(organizationMembershipAllProjectCapabilityTable)
            .values({
                organizationMembershipId: membership.id,
                capability: "project_update",
                grantedByUserId: OWNER,
            });
        const project = firstRow(
            await db
                .insert(projectTable)
                .values({
                    slug: "test-project",
                    title: "Test",
                    directoryVisibility: "listed",
                    currentContentId: 1,
                })
                .returning(),
        );
        projectId = project.id;
        await db
            .insert(projectOrganizationOwnershipTable)
            .values({ projectId, organizationId: organization.id });
        for (const publicId of [DOCUMENT, PARTICIPANT_ONLY_DOCUMENT]) {
            const document = firstRow(
                await db
                    .insert(projectDocumentTable)
                    .values({
                        projectId,
                        publicId,
                        defaultLanguageCode: "en",
                        createdByUsername: "owner",
                        publishedAt: new Date(),
                    })
                    .returning(),
            );
            await db.insert(projectDocumentLocalizationTable).values({
                projectDocumentId: document.id,
                languageCode: "en",
                name: "Report",
                downloadFileName: "report.html",
            });
            await db.insert(projectDocumentFileTable).values({
                projectDocumentId: document.id,
                audience: "participant",
                status: "available",
                objectKey: `${publicId}/participant`,
                originalFileName: "report.html",
                contentType: "text/html",
                byteSize: 100,
            });
            if (publicId === DOCUMENT)
                await db.insert(projectDocumentFileTable).values({
                    projectDocumentId: document.id,
                    audience: "owner",
                    status: "available",
                    objectKey: `${publicId}/owner`,
                    originalFileName: "private.html",
                    contentType: "text/html",
                    byteSize: 200,
                });
        }
        const conversation = firstRow(
            await db
                .insert(conversationTable)
                .values({
                    projectId,
                    slugId: "convo001",
                    polisConfigId: 1,
                    currentContentId: 1,
                })
                .returning(),
        );
        const opinion = firstRow(
            await db
                .insert(opinionTable)
                .values({
                    conversationId: conversation.id,
                    slugId: "opinion1",
                    authorId: OWNER,
                    currentContentId: 1,
                })
                .returning(),
        );
        await db.insert(voteTable).values({
            opinionId: opinion.id,
            authorId: PARTICIPANT,
            currentContentId: 1,
        });
    });

    function request({
        audience,
        mode = "inline",
        documentId = DOCUMENT,
    }: {
        audience: AccessProjectDocumentRequest["audience"];
        mode?: AccessProjectDocumentRequest["mode"];
        documentId?: string;
    }): AccessProjectDocumentRequest {
        return {
            projectSlug: "test-project",
            documentId,
            audience,
            languageCode: "en",
            mode,
        };
    }

    it("migrates existing documents to 50 MiB without enabling their scripts", async () => {
        const migration = readFileSync(
            new URL(
                "../database/flyway/V0091__massive_pet_avengers.sql",
                import.meta.url,
            ),
            "utf8",
        );
        await db.transaction(async (tx) => {
            await tx.execute(sql`ALTER TABLE project_document_file
                DROP CONSTRAINT project_document_file_html_scripts_check,
                DROP COLUMN html_scripts_enabled,
                DROP CONSTRAINT project_document_file_byte_size_check,
                ADD CONSTRAINT project_document_file_byte_size_check
                    CHECK (byte_size > 0 AND byte_size <= 20971520)`);
            await tx.execute(sql.raw(migration));
            const files = await tx.select().from(projectDocumentFileTable);
            expect(files).toHaveLength(3);
            expect(files.every((file) => !file.htmlScriptsEnabled)).toBe(true);
            const updated = await tx
                .update(projectDocumentFileTable)
                .set({ byteSize: 40 * 1024 * 1024 })
                .returning({ byteSize: projectDocumentFileTable.byteSize });
            expect(updated).toHaveLength(3);
            await expect(
                tx.transaction(async (savepoint) => {
                    await savepoint
                        .update(projectDocumentFileTable)
                        .set({ byteSize: 51 * 1024 * 1024 });
                }),
            ).rejects.toMatchObject({ cause: { code: "23514" } });
        });
    });

    it("returns both versions for an owner and retains participant-only documents", async () => {
        const documents = await fetchProjectPageDocuments({
            db,
            projectId,
            displayLanguageCode: "en",
            requesterUserId: OWNER,
        });
        expect(
            documents.find((document) => document.documentId === DOCUMENT)
                ?.versions,
        ).toEqual({
            participant: { audience: "participant", contentType: "text/html" },
            owner: { audience: "owner", contentType: "text/html" },
        });
        expect(
            documents.find(
                (document) => document.documentId === PARTICIPANT_ONLY_DOCUMENT,
            )?.versions.owner,
        ).toBeUndefined();
    });

    it("keeps old HTML static and enables scripts only for newly normalized uploads", async () => {
        const legacy = await accessProjectDocument({
            db,
            userId: OWNER,
            request: request({ audience: "owner" }),
        });
        expect(legacy.htmlScriptsEnabled).toBe(false);
        expect(legacy.downloadFileName).toBe("report-internal-restricted.html");
        const uploaded = await uploadProjectDocument({
            db,
            createdByUserId: OWNER,
            metadata: {
                projectSlug: "test-project",
                defaultLanguageCode: "en",
                localizations: [
                    {
                        languageCode: "en",
                        name: "Interactive report",
                        downloadFileName: "interactive.html",
                    },
                ],
            },
            participantFile: {
                buffer: Buffer.from(
                    "<!doctype html><html><body><script>document.body.dataset.ready='yes'</script></body></html>",
                ),
                originalFileName: "interactive.html",
                reportedContentType: "text/html",
            },
            ownerFile: undefined,
        });
        const fresh = await accessProjectDocument({
            db,
            userId: OWNER,
            request: request({
                audience: "participant",
                documentId: uploaded.document.documentId,
            }),
        });
        expect(fresh.htmlScriptsEnabled).toBe(true);
        await expect(
            db.update(projectDocumentFileTable).set({
                htmlScriptsEnabled: true,
                contentType: "application/pdf",
            }),
        ).rejects.toMatchObject({ cause: { code: "23514" } });
    });

    it.each([undefined, PARTICIPANT, STRANGER])(
        "does not expose owner versions to %s",
        async (requesterUserId) => {
            const documents = await fetchProjectPageDocuments({
                db,
                projectId,
                displayLanguageCode: "en",
                requesterUserId,
            });
            expect(documents).toHaveLength(2);
            for (const document of documents) {
                expect(document.versions.participant.audience).toBe(
                    "participant",
                );
                expect(document.versions.owner).toBeUndefined();
            }
        },
    );

    it.each([
        "participant",
        "owner",
    ] satisfies AccessProjectDocumentRequest["audience"][])(
        "lets owners explicitly view and download the %s version",
        async (audience) => {
            for (const mode of [
                "inline",
                "download",
            ] satisfies AccessProjectDocumentRequest["mode"][]) {
                const response = await accessProjectDocument({
                    db,
                    userId: OWNER,
                    request: request({ audience, mode }),
                });
                expect(response.audience).toBe(audience);
                expect(response.url).toBe(
                    `https://documents.example.com/${DOCUMENT}/${audience}`,
                );
            }
        },
    );

    it("lets a voter access the participant version but rejects owner-version requests", async () => {
        expect(
            (
                await accessProjectDocument({
                    db,
                    userId: PARTICIPANT,
                    request: request({ audience: "participant" }),
                })
            ).audience,
        ).toBe("participant");
        signUrl.mockClear();
        await expect(
            accessProjectDocument({
                db,
                userId: PARTICIPANT,
                request: request({ audience: "owner" }),
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(signUrl).not.toHaveBeenCalled();
    });

    it("rejects a nonparticipant and prevents cross-project document access", async () => {
        await expect(
            accessProjectDocument({
                db,
                userId: STRANGER,
                request: request({ audience: "participant" }),
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        await expect(
            accessProjectDocument({
                db,
                userId: OWNER,
                request: {
                    ...request({ audience: "owner" }),
                    projectSlug: "another-project",
                },
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(signUrl).not.toHaveBeenCalled();
    });

    it("never substitutes a participant file when the requested owner version is missing", async () => {
        await expect(
            accessProjectDocument({
                db,
                userId: OWNER,
                request: request({
                    audience: "owner",
                    documentId: PARTICIPANT_ONLY_DOCUMENT,
                }),
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(signUrl).not.toHaveBeenCalled();
    });

    it("omits deleted owner versions and denies their access", async () => {
        await db
            .update(projectDocumentFileTable)
            .set({ deletedAt: new Date() })
            .where(eq(projectDocumentFileTable.audience, "owner"));
        const documents = await fetchProjectPageDocuments({
            db,
            projectId,
            displayLanguageCode: "en",
            requesterUserId: OWNER,
        });
        expect(
            documents.every(
                (document) => document.versions.owner === undefined,
            ),
        ).toBe(true);
        await expect(
            accessProjectDocument({
                db,
                userId: OWNER,
                request: request({ audience: "owner" }),
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
    });

    it("rechecks ownership before signing after a capability is revoked", async () => {
        await db
            .update(organizationMembershipAllProjectCapabilityTable)
            .set({ deletedAt: new Date(), revokedByUserId: OWNER })
            .where(
                and(
                    eq(
                        organizationMembershipAllProjectCapabilityTable.capability,
                        "project_update",
                    ),
                ),
            );
        await expect(
            accessProjectDocument({
                db,
                userId: OWNER,
                request: request({ audience: "owner" }),
            }),
        ).rejects.toMatchObject({ statusCode: 403 });
        expect(signUrl).not.toHaveBeenCalled();
    });
});
