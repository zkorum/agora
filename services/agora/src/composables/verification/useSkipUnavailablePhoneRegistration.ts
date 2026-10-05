import type { PhoneAuthAvailability } from "src/utils/auth/phoneAuthMode";
import { computed, type MaybeRefOrGetter, toValue, watch } from "vue";

export function useSkipUnavailablePhoneRegistration({
  availability,
  ready = true,
  redirect,
}: {
  availability: MaybeRefOrGetter<PhoneAuthAvailability>;
  ready?: MaybeRefOrGetter<boolean>;
  redirect: () => Promise<unknown>;
}) {
  const shouldSkip = computed(() => {
    const status = toValue(availability);
    return !status.available && status.reason === "registration_unavailable";
  });

  watch(
    [shouldSkip, () => toValue(ready)],
    ([skip, isReady]) => {
      if (skip && isReady) void redirect();
    },
    { immediate: true }
  );

  return shouldSkip;
}
