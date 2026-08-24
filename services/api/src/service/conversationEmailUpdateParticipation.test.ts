import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import { buildConversationEmailParticipationQuery } from "@/shared-backend/conversationEmailUpdateParticipation.js";

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
