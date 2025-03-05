import { useDocumentVisibility } from "@vueuse/core";
import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useNotificationStore } from "src/stores/notification";
import { watch } from "vue";

export function useNotificationRefresher() {
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());
  const { loadNotificationData } = useNotificationStore();
  const documentVisibility = useDocumentVisibility();

  watch(documentVisibility, async () => {
    if (isAuthenticated.value && documentVisibility.value == "visible") {
      await loadNotificationData(false);
    }
  });
}
