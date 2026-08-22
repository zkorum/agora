import { describe, expect, it } from "vitest";
import { buildConversationEmailActionUrls } from "./actionLinks.js";

describe("buildConversationEmailActionUrls", () => {
    it("separates the visible confirmation from the RFC one-click endpoint", () => {
        expect(
            buildConversationEmailActionUrls({
                siteBaseUrl: "https://www.agoracitizen.app",
                unsubscribeToken: "unsubscribe-token",
                manageToken: "manage-token",
                reportToken: "report-token",
            }),
        ).toEqual({
            visibleUnsubscribeUrl:
                "https://www.agoracitizen.app/email-updates/unsubscribe/unsubscribe-token",
            oneClickUnsubscribeUrl:
                "https://www.agoracitizen.app/api/v1/conversation/email-update/action/one-click/unsubscribe-token",
            manageUrl:
                "https://www.agoracitizen.app/email-updates/preferences/manage-token",
            reportUrl:
                "https://www.agoracitizen.app/email-updates/report/report-token",
        });
    });
});
