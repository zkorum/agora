import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import {
    conversationEmailUpdateRecipientTable,
    conversationEmailUpdateTable,
} from "@/shared-backend/schema.js";
import {
    deliveryUpdateIsExclusiveToConversation,
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
});
