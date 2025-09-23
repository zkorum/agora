import { defineStore } from "#q-app/wrappers";
import { createSentryPiniaPlugin } from "@sentry/vue";
import { createPinia } from "pinia";
import { type Router } from "vue-router";

/*
 * When adding new properties to stores, you should also
 * extend the `PiniaCustomProperties` interface.
 * @see https://pinia.vuejs.org/core-concepts/plugins.html#typing-new-store-properties
 */
declare module "pinia" {
  export interface PiniaCustomProperties {
    readonly router: Router;
  }
}

export default defineStore((/* { ssrContext } */) => {
  const pinia = createPinia();
  pinia.use(createSentryPiniaPlugin());
  return pinia;
});
