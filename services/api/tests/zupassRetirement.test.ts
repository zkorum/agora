import { readFileSync } from "node:fs";
import { pushSchema } from "drizzle-kit/api-postgres";
import { eq, sql } from "drizzle-orm";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { Pool } from "pg";
import postgres from "postgres";
import { GenericContainer, type StartedTestContainer } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getDeviceStatus } from "../src/service/authUtil.js";
import * as schema from "../src/shared-backend/schema.js";
import {
    listPremiumFeatureEntitlements,
    revokePremiumFeatureEntitlement,
    updatePremiumFeatureEntitlement,
} from "../src/service/premiumEntitlement.js";
import {
    conversationContentTable,
    conversationTable,
    deviceTable,
    eventTicketTable,
    organizationTable,
    polisConversationConfigTable,
    premiumFeatureEntitlementTable,
    projectTable,
    realtimeEventOutboxTable,
    userTable,
} from "../src/shared-backend/schema.js";

const migration = readFileSync(
    new URL("../database/flyway/V0113.1__retire_zupass.sql", import.meta.url),
    "utf8",
);
const USER_ID = "00000000-0000-4000-8000-000000000001";
const NOW = new Date("2026-10-01T12:00:00Z");

function firstRow<T>(rows: T[]): T {
    const row = rows.at(0);
    if (row === undefined) throw new Error("Missing fixture row");
    return row;
}

describe("Zupass data retirement", () => {
    let container: StartedTestContainer;
    let client: postgres.Sql;
    let db: PostgresJsDatabase;

    beforeAll(async () => {
        container = await new GenericContainer("postgres:16-alpine")
            .withEnvironment({
                POSTGRES_USER: "postgres",
                POSTGRES_PASSWORD: "postgres",
                POSTGRES_DB: "retirement",
            })
            .withExposedPorts(5432)
            .start();
        client = postgres({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            username: "postgres",
            password: "postgres",
            database: "retirement",
            onnotice: () => {},
        });
        db = drizzle({ client });
        // Exercise current canonical constraints and foreign keys, not a parallel hand-written schema.
        const pool = new Pool({
            host: container.getHost(),
            port: container.getMappedPort(5432),
            user: "postgres",
            password: "postgres",
            database: "retirement",
        });
        try {
            const migration = await pushSchema(
                schema,
                drizzlePg({ client: pool }),
            );
            await migration.apply();
        } finally {
            await pool.end();
        }
    }, 120_000);

    afterAll(async () => {
        await client?.end({ timeout: 5 });
        await container?.stop();
    }, 120_000);

    it("purges only retired grants, removes restrictions, and preserves identities and replay IDs idempotently", async () => {
        await db
            .insert(userTable)
            .values({ id: USER_ID, username: "participant" });
        await db.insert(deviceTable).values({
            didWrite: "did:key:retained",
            userId: USER_ID,
            userAgent: "test",
            sessionExpiry: new Date("2027-01-01T00:00:00Z"),
        });
        const organization = firstRow(
            await db
                .insert(organizationTable)
                .values({
                    slug: "retirement",
                    displayName: "Retirement",
                    defaultLanguageCode: "en",
                    directoryVisibility: "listed",
                    isFullImagePath: false,
                })
                .returning(),
        );
        const project = firstRow(
            await db
                .insert(projectTable)
                .values({
                    slug: "retirement",
                    title: "Retirement",
                    directoryVisibility: "listed",
                })
                .returning(),
        );
        await db.insert(eventTicketTable).values({
            userId: USER_ID,
            provider: "zupass",
            eventSlug: "devconnect-2025",
            nullifier: "retained-nullifier",
        });
        const grants = await db
            .insert(premiumFeatureEntitlementTable)
            .values([
                {
                    organizationId: organization.id,
                    feature: "event_ticket",
                    startsAt: NOW,
                },
                {
                    organizationId: organization.id,
                    feature: "event_ticket",
                    startsAt: NOW,
                    revokedAt: NOW,
                },
                {
                    organizationId: organization.id,
                    feature: "survey",
                    startsAt: NOW,
                },
            ])
            .returning();

        const retiredGrant = firstRow(
            grants.filter((row) => row.feature === "event_ticket"),
        );
        expect(
            (await listPremiumFeatureEntitlements({ db })).entitlements.map(
                (row) => row.feature,
            ),
        ).toEqual(["survey"]);
        await expect(
            updatePremiumFeatureEntitlement({
                db,
                data: {
                    entitlementId: retiredGrant.id,
                    startsAt: NOW.toISOString(),
                    revokedAt: null,
                },
                adminUserId: USER_ID,
                now: NOW,
                valkey: undefined,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
        await expect(
            revokePremiumFeatureEntitlement({
                db,
                entitlementId: retiredGrant.id,
                adminUserId: USER_ID,
                now: NOW,
            }),
        ).rejects.toMatchObject({ statusCode: 404 });
        expect(
            await db
                .select()
                .from(premiumFeatureEntitlementTable)
                .orderBy(premiumFeatureEntitlementTable.id),
        ).toEqual(grants);

        const supportedGrant = firstRow(
            grants.filter((row) => row.feature === "survey"),
        );
        await updatePremiumFeatureEntitlement({
            db,
            data: {
                entitlementId: supportedGrant.id,
                startsAt: NOW.toISOString(),
                adminNote: "Supported grant remains editable",
            },
            adminUserId: USER_ID,
            now: NOW,
            valkey: undefined,
        });
        const grantsBeforePurge = await db
            .select()
            .from(premiumFeatureEntitlementTable);
        const participationModes = [
            "guest",
            "account_required",
            "email_verification",
            "strong_verification",
        ] as const;
        for (const [index, participationMode] of participationModes.entries()) {
            const config = firstRow(
                await db
                    .insert(polisConversationConfigTable)
                    .values({})
                    .returning(),
            );
            const conversation = firstRow(
                await db
                    .insert(conversationTable)
                    .values({
                        slugId: `retire${index}`,
                        projectId: project.id,
                        polisConfigId: config.id,
                        participationMode,
                        isIndexed: false,
                        isClosed: index === 2,
                        requiresEventTicket: "devconnect-2025",
                    })
                    .returning(),
            );
            if (index !== 3) {
                const content = firstRow(
                    await db
                        .insert(conversationContentTable)
                        .values({
                            conversationId: conversation.id,
                            title: "Preserve content",
                        })
                        .returning(),
                );
                await db
                    .update(conversationTable)
                    .set({ currentContentId: content.id })
                    .where(eq(conversationTable.id, conversation.id));
            }
        }
        const event = firstRow(
            await db
                .insert(realtimeEventOutboxTable)
                .values({
                    eventType: "conversation_settings_updated",
                    deliveryId: 17,
                    payload: {
                        conversationSlugId: "retire0",
                        timestamp: 1,
                        settings: {
                            participationMode: "guest",
                            requiresEventTicket: "devconnect-2025",
                            isIndexed: false,
                        },
                    },
                })
                .returning(),
        );
        const conversationsBefore = await db
            .select()
            .from(conversationTable)
            .orderBy(conversationTable.id);
        const contentsBefore = await db.select().from(conversationContentTable);
        const usersBefore = await db.select().from(userTable);
        const devicesBefore = await db.select().from(deviceTable);
        const ticketsBefore = await db.select().from(eventTicketTable);

        await db.transaction(async (tx) => {
            await tx.execute(sql.raw(migration));
        });
        await db.transaction(async (tx) => {
            await tx.execute(sql.raw(migration));
        });

        expect(
            await db
                .select()
                .from(conversationTable)
                .orderBy(conversationTable.id),
        ).toEqual(
            conversationsBefore.map((row) => ({
                ...row,
                requiresEventTicket: null,
            })),
        );
        expect(await db.select().from(conversationContentTable)).toEqual(
            contentsBefore,
        );
        expect(await db.select().from(userTable)).toEqual(usersBefore);
        expect(await db.select().from(deviceTable)).toEqual(devicesBefore);
        expect(
            await getDeviceStatus({
                db,
                didWrite: "did:key:retained",
                now: NOW,
            }),
        ).toMatchObject({
            isKnown: true,
            userId: USER_ID,
            isRegistered: false,
            isLoggedIn: false,
        });
        const ticketsAfter = await db.select().from(eventTicketTable);
        expect(ticketsAfter).toHaveLength(ticketsBefore.length);
        expect(ticketsAfter.at(0)).toMatchObject({
            id: ticketsBefore.at(0)?.id,
            nullifier: "retained-nullifier",
            userId: USER_ID,
            isDeleted: true,
        });
        expect(await db.select().from(premiumFeatureEntitlementTable)).toEqual(
            grantsBeforePurge.filter((row) => row.feature !== "event_ticket"),
        );
        expect(await db.select().from(realtimeEventOutboxTable)).toEqual([
            {
                ...event,
                payload: {
                    conversationSlugId: "retire0",
                    timestamp: 1,
                    settings: { participationMode: "guest", isIndexed: false },
                },
            },
        ]);
    });
});
