import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { watch } from "vue";

export function useNotificationRefresher() {
  const { isGuestOrLoggedIn } = storeToRefs(useAuthenticationStore());
  const { loadNotificationData } = useNotificationStore();
  const documentVisibility = useDocumentVisibility();

  watch(documentVisibility, async () => {
    if (isGuestOrLoggedIn.value && documentVisibility.value == "visible") {
      await loadNotificationData(false);
    }
  });
}
