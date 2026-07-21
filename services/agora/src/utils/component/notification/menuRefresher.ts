import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { runNotificationRefreshInBackground } from "src/utils/api/notification/requestError";
import { watch } from "vue";

export function useNotificationRefresher() {
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { refreshNotificationData } = useNotificationStore();
  const documentVisibility = useDocumentVisibility();

  watch(documentVisibility, async () => {
    // Guests use DID-authenticated notifications too; only anonymous users are excluded.
    if (isGuestOrLoggedIn.value && documentVisibility.value === "visible") {
      await runNotificationRefreshInBackground(refreshNotificationData);
    }
  });
}
