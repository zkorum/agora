import { describe, expect, it, vi } from "vitest";
import { createPhoneTurnstileVerifier } from "../src/service/phoneTurnstile.js";

describe("phone Turnstile validation", () => {
    const log = { warn: vi.fn() };

    function verifier(fetchSiteverify: typeof fetch) {
        return createPhoneTurnstileVerifier({
            secretKey: "test-secret",
            allowedHostnames: ["www.agoracitizen.app"],
            fetchSiteverify,
            log,
        });
    }

    it("never calls Siteverify for missing or oversized tokens", async () => {
        const fetchSiteverify = vi.fn<typeof fetch>();
        const guard = verifier(fetchSiteverify);
        expect(await guard.verify(undefined)).toBe(false);
        expect(await guard.verify("x".repeat(2049))).toBe(false);
        expect(fetchSiteverify).not.toHaveBeenCalled();
    });

    it("accepts only a successful phone action on an explicitly allowed hostname", async () => {
        const fetchSiteverify = vi.fn<typeof fetch>(async () =>
            Response.json({
                success: true,
                hostname: "www.agoracitizen.app",
                action: "phone_sms",
            }),
        );
        expect(await verifier(fetchSiteverify).verify("single-use-token")).toBe(
            true,
        );
        const [, options] = fetchSiteverify.mock.calls[0];
        expect(options?.method).toBe("POST");
        expect(options?.body).toEqual(
            new URLSearchParams({
                secret: "test-secret",
                response: "single-use-token",
            }),
        );
    });

    it("revalidates each use of a token so a provider-rejected replay fails", async () => {
        const fetchSiteverify = vi
            .fn<typeof fetch>()
            .mockResolvedValueOnce(
                Response.json({
                    success: true,
                    hostname: "www.agoracitizen.app",
                    action: "phone_sms",
                }),
            )
            .mockResolvedValueOnce(Response.json({ success: false }));
        const guard = verifier(fetchSiteverify);
        expect(await guard.verify("token")).toBe(true);
        expect(await guard.verify("token")).toBe(false);
        expect(fetchSiteverify).toHaveBeenCalledTimes(2);
    });

    it.each([
        {
            success: false,
            hostname: "www.agoracitizen.app",
            action: "phone_sms",
        },
        { success: true, hostname: "attacker.example", action: "phone_sms" },
        {
            success: true,
            hostname: "www.agoracitizen.app",
            action: "guest_write",
        },
        { success: true, action: "phone_sms" },
        { success: true, hostname: "www.agoracitizen.app" },
    ])("rejects untrusted Siteverify results %#", async (body) => {
        const fetchSiteverify = vi.fn<typeof fetch>(async () =>
            Response.json(body),
        );
        expect(await verifier(fetchSiteverify).verify("token")).toBe(false);
    });

    it("fails closed on network errors, bad status, and malformed results", async () => {
        for (const fetchSiteverify of [
            vi.fn<typeof fetch>(async () => {
                throw new Error("Siteverify unavailable");
            }),
            vi.fn<typeof fetch>(async () => new Response("", { status: 503 })),
            vi.fn<typeof fetch>(async () => Response.json({ success: "true" })),
        ]) {
            expect(await verifier(fetchSiteverify).verify("token")).toBe(false);
        }
    });
});
