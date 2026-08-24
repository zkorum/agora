import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import {
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateTable,
    conversationEmailUpdateTestAttemptTable,
} from "@/shared-backend/schema.js";
import {
    activeOwnerAuthorizationQuery,
    createRecipientActions,
    deliveryUpdateIsExclusiveToConversation,
    testAttemptHasNoActiveSuppressions,
    updateIsExclusiveToConversation,
} from "./store.js";

describe("scoped store predicates", () => {
    it("requires an update link to the target and forbids every other conversation link", () => {
        const db = drizzle.mock();
        const query = db
            .select({ id: conversationEmailUpdateTable.id })
            .from(conversationEmailUpdateTable)
            .where(
                updateIsExclusiveToConversation({
                    db,
                    updateId: conversationEmailUpdateTable.id,
                    conversationId: 42,
                }),
            )
            .toSQL();

        expect(query.sql).toContain("exists");
        expect(query.sql).toContain("not exists");
        expect(query.sql).toContain(
            '"scoped_update_conversation"."conversation_id" <> $2',
        );
        expect(query.params).toEqual([42, 42]);
    });

    it("applies the same exclusive update scope through a delivery", () => {
        const db = drizzle.mock();
        const query = db
            .select({ id: conversationEmailUpdateRecipientTable.id })
            .from(conversationEmailUpdateRecipientTable)
            .where(
                deliveryUpdateIsExclusiveToConversation({
                    db,
                    deliveryId:
                        conversationEmailUpdateRecipientTable.deliveryId,
                    conversationId: 91,
                }),
            )
            .toSQL();

        expect(query.sql).toContain("exists");
        expect(query.sql).toContain("not exists");
        expect(query.sql).toContain(
            '"scoped_update_conversation"."conversation_id" <> $2',
        );
        expect(query.sql).toContain(
            '"scoped_delivery"."id" = "conversation_email_update_recipient"."delivery_id"',
        );
        expect(query.params).toEqual([91, 91]);
    });

    it("rejects active requester complaints and canonical-email suppressions for test sends", () => {
        const db = drizzle.mock();
        const query = db
            .select({ id: conversationEmailUpdateTestAttemptTable.id })
            .from(conversationEmailUpdateTestAttemptTable)
            .where(testAttemptHasNoActiveSuppressions({ db }))
            .toSQL();

        expect(query.sql).toContain(
            'not exists (select "id" from "conversation_email_update_user_complaint_suppression"',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_complaint_suppression"."user_id" = "conversation_email_update_test_attempt"."requested_by_user_id"',
        );
        expect(query.sql).toContain(
            'not exists (select "id" from "conversation_email_update_email_suppression"',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_email_suppression"."canonical_email" = "conversation_email_update_test_attempt"."destination_email_snapshot"',
        );
        expect(query.sql.match(/"lifted_at" is null/g)).toHaveLength(2);
    });

    it("requires active owner membership, capability, organization, and project ownership", () => {
        const db = drizzle.mock();
        const query = activeOwnerAuthorizationQuery({
            db,
            userId: "f97f8461-8c04-4604-ae09-29e417b9b1e9",
            projectId: 42,
        }).toSQL();

        expect(query.sql).toContain(
            'inner join "organization" on ("organization"."id" = "organization_membership"."organization_id" and "organization"."deleted_at" is null)',
        );
        expect(query.sql).toContain(
            'inner join "project_organization_ownership" on ("project_organization_ownership"."organization_id" = "organization"."id" and "project_organization_ownership"."project_id" = $1 and "project_organization_ownership"."deleted_at" is null)',
        );
        expect(query.sql).toContain(
            'inner join "organization_membership_all_project_capability" on ("organization_membership_all_project_capability"."organization_membership_id" = "organization_membership"."id" and "organization_membership_all_project_capability"."capability" = $2 and "organization_membership_all_project_capability"."deleted_at" is null)',
        );
        expect(query.sql).toContain(
            'where ("organization_membership"."user_id" = $3 and "organization_membership"."deleted_at" is null)',
        );
        expect(query.params).toEqual([
            42,
            "conversation_email_update",
            "f97f8461-8c04-4604-ae09-29e417b9b1e9",
            1,
        ]);
    });

    it("creates scoped owner actions and tokens without a one-click provider URL", () => {
        const result = createRecipientActions({
            siteBaseUrl: "https://www.agoracitizen.app",
            kind: "conversation_owner_copy",
            scopeKind: "no_project",
        });

        expect(result.kind).toBe("conversation_owner_copy");
        expect(result.actions.unsubscribeScope).toBe("conversation");
        expect(result.actions.unsubscribeUrl).toContain(
            "/email-updates/unsubscribe/",
        );
        expect(result.actions.manageUrl).toContain(
            "/email-updates/preferences/",
        );
        expect(result.actions.reportUrl).toContain("/email-updates/report/");
        expect(result.actionTokens.unsubscribeHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.actionTokens.manageHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.actionTokens.reportHash).toMatch(/^[a-f0-9]{64}$/);
        expect(result.unsubscribeUrl).toBeUndefined();
    });

    it("retains one-click provider unsubscribe for participants", () => {
        const result = createRecipientActions({
            siteBaseUrl: "https://www.agoracitizen.app",
            kind: "participant",
            scopeKind: "listed_project",
        });

        expect(result.kind).toBe("participant");
        expect(result.actions.unsubscribeScope).toBe("project");
        expect(result.unsubscribeUrl).toContain(
            "/api/v1/conversation/email-update/action/one-click/",
        );
    });
});
