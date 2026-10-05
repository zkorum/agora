import type { PhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, ref } from "vue";

import { useSkipUnavailablePhoneRegistration } from "./useSkipUnavailablePhoneRegistration";

describe("unavailable phone registration navigation", () => {
  it("waits for auth initialization before skipping a restricted registration page", async () => {
    const scope = effectScope();
    const ready = ref(false);
    const availability = ref<PhoneAuthAvailability>({
      available: false,
      reason: "registration_unavailable",
    });
    const redirect = vi.fn(() => Promise.resolve());
    const skip = scope.run(() =>
      useSkipUnavailablePhoneRegistration({ availability, ready, redirect })
    );

    expect(skip?.value).toBe(true);
    expect(redirect).not.toHaveBeenCalled();

    availability.value = { available: true };
    ready.value = true;
    await nextTick();
    expect(skip?.value).toBe(false);
    expect(redirect).not.toHaveBeenCalled();

    availability.value = {
      available: false,
      reason: "registration_unavailable",
    };
    await nextTick();
    expect(redirect).toHaveBeenCalledOnce();
    scope.stop();
  });

  it("retains the normal technical-unavailability experience", () => {
    const scope = effectScope();
    const redirect = vi.fn(() => Promise.resolve());
    const skip = scope.run(() =>
      useSkipUnavailablePhoneRegistration({
        availability: { available: false, reason: "technical_unavailable" },
        redirect,
      })
    );

    expect(skip?.value).toBe(false);
    expect(redirect).not.toHaveBeenCalled();
    scope.stop();
  });
});
