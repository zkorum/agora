import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { useDialog } from "src/utils/ui/dialog";
import { useRouter } from "vue-router";

export function usenewPostButtonTrigger() {
  const router = useRouter();
  const dialog = useDialog();
  const { isAuthenticated } = storeToRefs(useAuthenticationStore());

  async function requestNewPost() {
    if (isAuthenticated.value) {
      await router.push({ name: "/conversation/create/" });
    } else {
      dialog.showLoginConfirmationDialog();
    }
  }

  return { requestNewPost };
}
