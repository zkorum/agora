import { describe, expect, it } from "vitest";

import { isActiveRegisteredDeviceStatus } from "./authUtil.js";

const credentials = { email: null, phone: null, rarimo: null };

describe("active registered device status", () => {
    it("requires a known, registered, actively logged-in device", () => {
        expect(
            isActiveRegisteredDeviceStatus({
                isKnown: true,
                isRegistered: true,
                isLoggedIn: true,
                userId: "00000000-0000-4000-8000-000000000001",
                credentials,
                sessionExpiry: new Date("2026-01-02T00:00:00.000Z"),
            }),
        ).toBe(true);
        expect(
            isActiveRegisteredDeviceStatus({
                isKnown: true,
                isRegistered: true,
                isLoggedIn: false,
                userId: "00000000-0000-4000-8000-000000000001",
                credentials,
                sessionExpiry: new Date("2026-01-01T00:00:00.000Z"),
            }),
        ).toBe(false);
        expect(
            isActiveRegisteredDeviceStatus({
                isKnown: true,
                isRegistered: false,
                isLoggedIn: false,
                userId: "00000000-0000-4000-8000-000000000001",
                credentials,
                sessionExpiry: new Date("2026-01-02T00:00:00.000Z"),
            }),
        ).toBe(false);
        expect(
            isActiveRegisteredDeviceStatus({
                isKnown: false,
                isRegistered: false,
                isLoggedIn: false,
                credentials,
            }),
        ).toBe(false);
    });
});
