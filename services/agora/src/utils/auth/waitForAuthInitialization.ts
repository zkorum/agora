import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { watch } from "vue";

export async function waitForAuthInitialization(): Promise<void> {
  const { isAuthInitialized } = storeToRefs(useAuthenticationStore());

  if (isAuthInitialized.value) {
    return;
  }

  await new Promise<void>((resolve) => {
    const stop = watch(isAuthInitialized, (initialized) => {
      if (initialized) {
        stop();
        resolve();
      }
    });
  });
}
