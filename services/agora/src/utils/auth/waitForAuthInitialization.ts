import { storeToRefs } from "pinia";
import { useAuthenticationStore } from "src/stores/authentication";
import { watch } from "vue";

// TODO: Reuse this for optional-auth API wrappers that currently decide between
// anonymous and authenticated requests from a raw isAuthInitialized.value check.
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
