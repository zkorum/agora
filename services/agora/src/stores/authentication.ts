import { defineStore } from "pinia";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { computed, ref } from "vue";

export type LoginStatusUpdate =
  | (Partial<DeviceLoginStatus> & { isKnown: true; userId: string })
  | (Partial<DeviceLoginStatus> & { isKnown?: false | undefined });

export const useAuthenticationStore = defineStore("authentication", () => {
  const verificationPhoneNumber = ref("");
  const verificationDefaultCallingCode = ref("");
  const nullCredentials = {
    email: null,
    phone: null,
    rarimo: null,
  } as const;

  const _loginStatus = ref<DeviceLoginStatus>({
    isLoggedIn: false,
    isRegistered: false,
    isKnown: false,
    credentials: nullCredentials,
  });

  const isRegistered = computed(() => _loginStatus.value.isRegistered);
  const isKnown = computed(() => _loginStatus.value.isKnown);
  const isGuest = computed(() => !isRegistered.value && isKnown.value); // there is no such thing as "logged-in" for guests
  const isLoggedIn = computed(
    () =>
      // note that backend already enforces that loggedIn users must be registered
      isRegistered.value && _loginStatus.value.isLoggedIn
  );
  const isGuestOrLoggedIn = computed(() => {
    return isGuest.value || isLoggedIn.value;
  });

  // Computed property to get userId (undefined if not known)
  const userId = computed(() => {
    if (_loginStatus.value.isKnown) {
      return _loginStatus.value.userId;
    }
    return undefined;
  });

  // Expose credentials for settings page display
  const credentials = computed(() => {
    if (!_loginStatus.value.isKnown) return nullCredentials;
    return _loginStatus.value.credentials;
  });

  // Strong verification = phone or rarimo (email alone is not strong)
  const hasStrongVerification = computed(() => {
    if (!_loginStatus.value.isKnown) return false;
    const creds = _loginStatus.value.credentials;
    return creds.phone !== null || creds.rarimo !== null;
  });

  // Email verification = specifically email credential (phone/Rarimo don't count)
  const hasEmailVerification = computed(() => {
    if (!_loginStatus.value.isKnown) return false;
    const creds = _loginStatus.value.credentials;
    return creds.email !== null;
  });

  // Function to safely update loginStatus
  function setLoginStatus(status: LoginStatusUpdate): {
    newLoginStatus: DeviceLoginStatus;
    oldLoginStatus: DeviceLoginStatus;
    newIsGuestOrLoggedIn: boolean;
    oldIsGuestOrLoggedIn: boolean;
  } {
    const oldLoginStatus = _loginStatus.value;
    const oldIsGuestOrLoggedIn = isGuestOrLoggedIn.value;

    if (status.isKnown === false) {
      _loginStatus.value = {
        isKnown: false,
        isLoggedIn: false,
        isRegistered: false,
        credentials: nullCredentials,
      };
    } else if (status.isKnown === true) {
      _loginStatus.value = {
        isKnown: true,
        isLoggedIn: status.isLoggedIn ?? _loginStatus.value.isLoggedIn,
        isRegistered: status.isLoggedIn
          ? true
          : (status.isRegistered ?? _loginStatus.value.isRegistered),
        userId: status.userId,
        credentials:
          status.credentials ??
          (oldLoginStatus.isKnown ? oldLoginStatus.credentials : nullCredentials),
      };
    } else if (oldLoginStatus.isKnown) {
      _loginStatus.value = {
        ...oldLoginStatus,
        isLoggedIn: status.isLoggedIn ?? oldLoginStatus.isLoggedIn,
        isRegistered: status.isLoggedIn
          ? true
          : (status.isRegistered ?? oldLoginStatus.isRegistered),
      };
    }
    return {
      newLoginStatus: _loginStatus.value,
      oldLoginStatus: oldLoginStatus,
      oldIsGuestOrLoggedIn: oldIsGuestOrLoggedIn,
      newIsGuestOrLoggedIn: isGuestOrLoggedIn.value,
    };
  }
  const isAuthInitialized = ref(false);

  return {
    verificationPhoneNumber,
    verificationDefaultCallingCode,
    isKnown,
    isRegistered,
    isLoggedIn,
    isGuest,
    isGuestOrLoggedIn,
    userId,
    credentials,
    hasStrongVerification,
    hasEmailVerification,
    setLoginStatus,
    isAuthInitialized,
  };
});
