import { describe, expect, it } from "vitest";
import { Dto } from "../src/shared/types/dto.js";
import {
    zodDateTimeFlexible,
    zodRegularNotificationItem,
} from "../src/shared/types/zod.js";
import {
    buildNotification,
    type NotificationContent,
} from "../src/service/notificationDto.js";
import { projectConversationTypeConfig } from "../src/shared/utils/conversationTypeConfig.js";
import { zodImportWorkerEvent } from "../src/service/importQueueContract.js";

describe("canonical boundary contracts", () => {
    it("requires import-worker notification timestamps to carry a timezone", () => {
        const event = {
            type: "import_notification",
            userId: "user",
            notificationSlugId: "notice",
            notificationIsRead: false,
            importId: 1,
            importSlugId: "import",
            conversationId: null,
        };
        expect(
            zodImportWorkerEvent.safeParse({
                ...event,
                notificationCreatedAt: "2026-10-04T12:00:00",
            }).success,
        ).toBe(false);
        expect(
            zodImportWorkerEvent.safeParse({
                ...event,
                notificationCreatedAt: "2026-10-04T12:00:00+00:00",
            }).success,
        ).toBe(true);
    });
    it.each([
        null,
        undefined,
        true,
        false,
        "",
        "not a date",
        new Date("invalid"),
        Infinity,
    ])("rejects malformed timestamp %s", (value) => {
        expect(zodDateTimeFlexible.safeParse(value).success).toBe(false);
    });

    it.each([
        new Date("2026-10-04T12:00:00.000Z"),
        "2026-10-04T12:00:00.000Z",
        "2026-10-04T14:00:00+02:00",
        1791115200000,
    ])("parses supported timestamp representations %s", (value) => {
        expect(zodDateTimeFlexible.parse(value).toISOString()).toBe(
            "2026-10-04T12:00:00.000Z",
        );
    });

    it("rejects Polis-only settings on ranking edits", () => {
        expect(
            Dto.updateConversationTypeConfig.safeParse({
                conversationType: "ranking",
                rankingMode: "bws",
                aiLabelingEnabled: true,
            }).success,
        ).toBe(false);
        const polis = Dto.updateConversationTypeConfig.parse({
            conversationType: "polis",
            votingPresentation: "one_at_a_time",
            aiLabelingEnabled: false,
            preferredOpinionGroupCount: 3,
        });
        expect(projectConversationTypeConfig(polis)).toEqual({
            conversationType: "polis",
            votingPresentation: "one_at_a_time",
        });
    });

    it("projects typed notification fragments into strict wire DTOs", () => {
        const base: Extract<NotificationContent, { type: "new_opinion" }> = {
            type: "new_opinion",
            username: "alice",
            message: "hello",
            routeTarget: {
                type: "opinion",
                conversationSlugId: "conv",
                opinionSlugId: "opinion",
            },
        };
        const content = {
            ...base,
            obsoleteField: true,
            routeTarget: { ...base.routeTarget, obsoleteRouteField: true },
        };
        const record = {
            slugId: "notice",
            createdAt: new Date(),
            isRead: false,
            internalId: 42,
        };
        const notification = buildNotification({ content, record });
        expect(zodRegularNotificationItem.safeParse(notification).success).toBe(
            true,
        );
        expect(notification).not.toHaveProperty("obsoleteField");
        expect(notification.routeTarget).not.toHaveProperty(
            "obsoleteRouteField",
        );
        expect(notification).not.toHaveProperty("internalId");
    });
});
