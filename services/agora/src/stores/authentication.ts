import { defineStore } from "pinia";
import type { DeviceLoginStatus } from "src/shared/types/zod";
import { computed, ref } from "vue";

export const useAuthenticationStore = defineStore("authentication", () => {
  const verificationPhoneNumber = ref("");
  const verificationDefaultCallingCode = ref("");
  const _loginStatus = ref<DeviceLoginStatus>({
    isLoggedIn: false,
    isRegistered: false,
    isKnown: false,
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

  // Function to safely update loginStatus
  function setLoginStatus(status: Partial<DeviceLoginStatus>): {
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
      };
    } else if (
      status.isKnown === true ||
      _loginStatus.value.isKnown ||
      status.isRegistered ||
      status.isLoggedIn
    ) {
      // Get userId from status if provided, otherwise keep current userId
      // Default to empty string if neither exist (e.g., old cached state before userId was added)
      const currentUserId = _loginStatus.value.isKnown ? _loginStatus.value.userId : '';
      const newUserId = (status.isKnown === true && 'userId' in status && status.userId)
        ? status.userId
        : currentUserId;

      _loginStatus.value = {
        isKnown: true,
        isLoggedIn: status.isLoggedIn ?? _loginStatus.value.isLoggedIn,
        isRegistered: status.isLoggedIn
          ? true
          : (status.isRegistered ?? _loginStatus.value.isRegistered),
        userId: newUserId,
      };
    } else {
      _loginStatus.value = {
        isKnown: false,
        isLoggedIn: false,
        isRegistered: false,
      };
    }
    console.log(
      `Login status updated from input '${JSON.stringify(status)}' to '${JSON.stringify(_loginStatus.value)}'`
    );
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
    setLoginStatus,
    isAuthInitialized,
  };
});
