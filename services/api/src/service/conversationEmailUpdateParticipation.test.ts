import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import { buildConversationEmailParticipationQuery } from "@/shared-backend/conversationEmailUpdateParticipation.js";
import {
    buildWorkspaceAudienceEstimateQuery,
    splitWorkspaceAudienceEstimateBatches,
} from "./conversationEmailUpdate.js";

describe("buildConversationEmailParticipationQuery", () => {
    const cutoffAt = new Date("2026-08-25T12:00:00.000Z");

    it("builds the email-specific active participation rules", () => {
        const query = buildConversationEmailParticipationQuery({
            db: drizzle.mock(),
            cutoffAt,
            scope: { kind: "conversation_ids", conversationIds: [42] },
        }).toSQL();

        expect(query.sql).toContain(
            'inner join "vote_content" "conversation_email_current_vote_content"',
        );
        expect(query.sql).toContain(
            '"conversation_email_current_vote_content"."created_at" <=',
        );
        expect(query.sql).toContain('"opinion"."created_at" <=');
        expect(query.sql).toContain(
            '"opinion"."current_content_id" is not null',
        );
        expect(query.sql).toContain(
            '"opinion_moderation"."deleted_at" is null',
        );
        expect(query.sql).toContain(
            '"opinion_moderation"."moderation_action" <>',
        );
        expect(query.sql).toContain(
            '"maxdiff_comparison"."deleted_at" is null',
        );
        expect(query.sql).toContain(
            'from "maxdiff_comparison" "conversation_email_historical_maxdiff_comparison"',
        );
        expect(query.sql).toContain(
            '"conversation_email_historical_maxdiff_comparison"."created_at" <=',
        );
        expect(query.sql.match(/ union all /g)).toHaveLength(2);
        expect(query.params.filter((param) => param === "hide")).toHaveLength(
            2,
        );
        expect(
            query.params.filter((param) => param === cutoffAt.toISOString()),
        ).toHaveLength(3);
        expect(query.params.filter((param) => param === 42)).toHaveLength(3);
    });

    it("scopes worker materialization inside every participation branch", () => {
        const query = buildConversationEmailParticipationQuery({
            db: drizzle.mock(),
            cutoffAt,
            scope: { kind: "update", updateId: 91 },
        }).toSQL();

        expect(
            query.sql.match(/from "conversation_email_update_conversation"/g),
        ).toHaveLength(3);
        expect(query.params.filter((param) => param === 91)).toHaveLength(3);
    });
});

describe("buildWorkspaceAudienceEstimateQuery", () => {
    const cutoffAt = new Date("2026-08-25T12:00:00.000Z");

    it("builds one grouped audience count for all workspace conversations", () => {
        const query = buildWorkspaceAudienceEstimateQuery({
            db: drizzle.mock(),
            cutoffAt,
            conversationIds: [41, 42],
            projectIds: [7, 8],
            projectPreferenceConversationIds: [41],
            conversationPreferenceConversationIds: [42],
        }).toSQL();

        expect(query.sql.match(/count\(distinct /g)).toHaveLength(1);
        expect(query.sql).toContain(
            'group by "workspace_participation"."conversation_id"',
        );

        expect(query.sql).toContain(
            'left join (select distinct "project_organization_ownership"."project_id", "organization_membership"."user_id"',
        );
        expect(query.sql).toContain(
            '"workspace_required_owner"."project_id" = "conversation"."project_id"',
        );
        expect(query.sql).toContain(
            '"workspace_required_owner"."user_id" = "workspace_participation"."author_id"',
        );
        expect(query.sql).toContain(
            '"workspace_required_owner"."user_id" is null',
        );
        expect(query.sql).toContain(
            '"project_organization_ownership"."project_id" in',
        );

        expect(query.sql).toContain(
            '"conversation_email_update_user_project_preference"."enabled" =',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_conversation_preference"."user_id" is null',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_conversation_preference"."enabled" =',
        );

        expect(query.sql).toContain(
            'not exists (select "id" from "conversation_email_update_user_complaint_suppression"',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_complaint_suppression"."lifted_at" is null',
        );
        expect(query.sql).toContain(
            'not exists (select "id" from "conversation_email_update_email_suppression"',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_email_suppression"."canonical_email" = "email"."email"',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_email_suppression"."lifted_at" is null',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_global_setting"."paused_at" is null',
        );
        expect(query.sql).toContain(
            '"conversation_email_update_user_global_setting"."updated_at" <=',
        );

        expect(
            query.params.filter((param) => param === cutoffAt.toISOString()),
        ).toHaveLength(7);
        expect(query.params.filter((param) => param === 41)).toHaveLength(4);
        expect(query.params.filter((param) => param === 42)).toHaveLength(4);
        expect(query.params.filter((param) => param === 7)).toHaveLength(1);
        expect(query.params.filter((param) => param === 8)).toHaveLength(1);
    });
});

describe("splitWorkspaceAudienceEstimateBatches", () => {
    it("splits workspaces at the 1,000-conversation query boundary", () => {
        const items = Array.from({ length: 1_001 }, (_, index) => index);

        const batches = splitWorkspaceAudienceEstimateBatches({ items });

        expect(batches).toHaveLength(2);
        expect(batches[0]).toHaveLength(1_000);
        expect(batches[1]).toEqual([1_000]);
    });
});
