import { createPinia } from "pinia";
import { type Router } from "vue-router";

import { defineStore } from "#q-app/wrappers";

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

export default defineStore(() => createPinia());
