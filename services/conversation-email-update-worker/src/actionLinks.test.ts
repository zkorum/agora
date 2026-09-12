import { createHash } from "node:crypto";
import { assert, describe, expect, it } from "vitest";
import { createRecipientActions } from "./actionLinks.js";

function tokenFromUrl(url: string): string {
    const token = new URL(url).pathname.split("/").at(-1);
    assert(token !== undefined);
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    return token;
}

describe("recipient action capabilities", () => {
    it.each(["project", "conversation"] as const)(
        "binds each %s-scoped participant link to a unique token and exact purpose",
        (participantPreferenceScope) => {
            const result = createRecipientActions({
                siteBaseUrl: "https://www.agoracitizen.app",
                kind: "participant",
                participantPreferenceScope,
            });
            assert(result.kind === "participant");
            const links = [
                {
                    url: result.actions.conversationUnsubscribeUrl,
                    action: "unsubscribe_conversation",
                    days: 365,
                    path: "unsubscribe",
                },
                {
                    url: result.actions.manageUrl,
                    action: "manage_preferences",
                    days: 90,
                    path: "preferences",
                },
                {
                    url: result.actions.reportUrl,
                    action: "report",
                    days: 90,
                    path: "report",
                },
            ];
            if (participantPreferenceScope === "project") {
                assert(result.actions.projectUnsubscribeUrl !== undefined);
                links.push({
                    url: result.actions.projectUnsubscribeUrl,
                    action: "unsubscribe_project",
                    days: 365,
                    path: "unsubscribe",
                });
            } else {
                expect(result.actions.projectUnsubscribeUrl).toBeUndefined();
            }
            expect(result.actionTokens).toHaveLength(links.length);
            expect(
                new Set(result.actionTokens.map((token) => token.tokenHash))
                    .size,
            ).toBe(links.length);
            for (const link of links) {
                const raw = tokenFromUrl(link.url);
                expect(link.url).toBe(
                    `https://www.agoracitizen.app/email-updates/${link.path}/${raw}`,
                );
                expect(result.actionTokens).toContainEqual({
                    action: link.action,
                    tokenHash: createHash("sha256").update(raw).digest("hex"),
                    expiresInDays: link.days,
                });
                expect(JSON.stringify(result.actionTokens)).not.toContain(raw);
            }
            const oneClickTarget =
                result.actions.projectUnsubscribeUrl ??
                result.actions.conversationUnsubscribeUrl;
            expect(result.unsubscribeUrl).toBe(
                `https://www.agoracitizen.app/api/v1/conversation/email-update/action/one-click/${tokenFromUrl(oneClickTarget)}`,
            );
        },
    );

    it.each(["project", "conversation"] as const)(
        "creates only a report capability for owners in %s scope",
        (participantPreferenceScope) => {
            const result = createRecipientActions({
                siteBaseUrl: "https://www.agoracitizen.app",
                kind: "conversation_owner_copy",
                participantPreferenceScope,
            });
            assert(result.kind === "conversation_owner_copy");
            expect(Object.keys(result.actions)).toEqual(["reportUrl"]);
            expect(result.unsubscribeUrl).toBeUndefined();
            const raw = tokenFromUrl(result.actions.reportUrl);
            expect(result.actions.reportUrl).toBe(
                `https://www.agoracitizen.app/email-updates/report/${raw}`,
            );
            expect(result.actionTokens).toEqual([
                {
                    action: "report",
                    tokenHash: createHash("sha256").update(raw).digest("hex"),
                    expiresInDays: 90,
                },
            ]);
        },
    );
});
