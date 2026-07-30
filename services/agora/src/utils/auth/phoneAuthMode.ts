import type { PhoneAuthMode } from "src/shared/types/phone-auth";
import { processEnv } from "src/utils/processEnv";
import { computed, type MaybeRefOrGetter, ref, toValue } from "vue";

export type PhoneAuthPurpose = "login" | "registration" | "credential";
export type PhoneAuthUnavailableReason =
  | "technical_unavailable"
  | "registration_unavailable";

export type PhoneAuthAvailability =
  | { available: true }
  | { available: false; reason: PhoneAuthUnavailableReason };

const configuredPhoneAuthMode: PhoneAuthMode =
  processEnv.VITE_PHONE_AUTH_MODE ?? "enabled";
const backendPhoneAuthMode = ref<PhoneAuthMode>("enabled");

export function getEffectivePhoneAuthMode({
  configuredMode,
  backendMode,
}: {
  configuredMode: PhoneAuthMode;
  backendMode: PhoneAuthMode;
}): PhoneAuthMode {
  if (configuredMode === "disabled" || backendMode === "disabled") {
    return "disabled";
  }
  if (configuredMode === "login_only" || backendMode === "login_only") {
    return "login_only";
  }
  return "enabled";
}

export function restrictPhoneAuthMode(mode: "login_only" | "disabled"): void {
  backendPhoneAuthMode.value = getEffectivePhoneAuthMode({
    configuredMode: backendPhoneAuthMode.value,
    backendMode: mode,
  });
}

export function getPhoneAuthAvailability({
  mode,
  purpose,
}: {
  mode: PhoneAuthMode;
  purpose: PhoneAuthPurpose;
}): PhoneAuthAvailability {
  if (mode === "disabled") {
    return { available: false, reason: "technical_unavailable" };
  }

  if (mode === "login_only" && purpose !== "login") {
    return { available: false, reason: "registration_unavailable" };
  }

  return { available: true };
}

export function usePhoneAuthAvailability(
  purpose: MaybeRefOrGetter<PhoneAuthPurpose>
) {
  return computed(() =>
    getPhoneAuthAvailability({
      mode: getEffectivePhoneAuthMode({
        configuredMode: configuredPhoneAuthMode,
        backendMode: backendPhoneAuthMode.value,
      }),
      purpose: toValue(purpose),
    })
  );
}
