import { describe, expect, it } from "vitest";

import { moderationReasonsEnum } from "../src/shared-backend/schema.js";
import { Dto } from "../src/shared/types/dto.js";
import { zodModerationReason } from "../src/shared/types/zod.js";

describe("moderation reasons", () => {
    it("keeps the database and API reason enums aligned", () => {
        expect(moderationReasonsEnum.enumValues).toEqual(
            zodModerationReason.options,
        );
    });

    it.each(["off_topic", "other"])(
        "preserves %s in serialized moderation responses",
        (reason) => {
            const moderation = {
                status: "moderated",
                reason,
                explanation: "Moderator explanation",
                createdAt: "2026-11-09T12:00:00Z",
                updatedAt: "2026-11-09T12:00:00Z",
            };
            expect(
                Dto.getConversationModerationStatusResponse.parse({
                    ...moderation,
                    action: "lock",
                }),
            ).toMatchObject({ status: "moderated", reason });
            for (const action of ["move", "hide"]) {
                expect(
                    Dto.getOpinionModerationStatusResponse.parse({
                        ...moderation,
                        action,
                    }),
                ).toMatchObject({ status: "moderated", reason });
            }
        },
    );

    it.each(["off_topic", "other"])(
        "does not add %s to user-report reasons",
        (reportReason) => {
            expect(
                Dto.createConversationReportRequest.safeParse({
                    conversationSlugId: "convo123",
                    reportReason,
                    reportExplanation: "User explanation",
                }).success,
            ).toBe(false);
            expect(
                Dto.createOpinionReportRequest.safeParse({
                    opinionSlugId: "opinion123",
                    reportReason,
                    reportExplanation: "User explanation",
                }).success,
            ).toBe(false);
        },
    );

    it.each(["off_topic", "other"])(
        "accepts %s for conversation and statement moderation",
        (moderationReason) => {
            expect(
                Dto.moderateReportPostRequest.parse({
                    conversationSlugId: "convo123",
                    moderationReason,
                    moderationAction: "lock",
                    moderationExplanation: "Moderator explanation",
                }).moderationReason,
            ).toBe(moderationReason);
            expect(
                Dto.moderateReportCommentRequest.parse({
                    opinionSlugId: "opinion123",
                    moderationReason,
                    moderationAction: "hide",
                    moderationExplanation: "Moderator explanation",
                }).moderationReason,
            ).toBe(moderationReason);
        },
    );

    it.each(["others", "off-topic", "unknown"])(
        "rejects unsupported reason value %s",
        (moderationReason) => {
            expect(
                Dto.moderateReportPostRequest.safeParse({
                    conversationSlugId: "convo123",
                    moderationReason,
                    moderationAction: "lock",
                    moderationExplanation: "Moderator explanation",
                }).success,
            ).toBe(false);
            expect(
                Dto.moderateReportCommentRequest.safeParse({
                    opinionSlugId: "opinion123",
                    moderationReason,
                    moderationAction: "hide",
                    moderationExplanation: "Moderator explanation",
                }).success,
            ).toBe(false);
        },
    );
});
