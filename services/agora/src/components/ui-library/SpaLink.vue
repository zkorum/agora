<template>
  <!--
    SpaLink: Reliable internal navigation link.

    Renders an <a> with the correct href for accessibility, SEO, and
    middle-click support. SPA navigation is guaranteed by the global
    capture-phase click interceptor in boot/spaLinkInterceptor.ts
    (workaround for Vue 3.5 event delegation racing with native
    <a href> link following — see vuejs/router#846).

    Use instead of <RouterLink> for critical navigation links.
  -->
  <RouterLink v-slot="{ href, navigate }" :to="to" custom>
    <a :href="href" @click="navigate">
      <slot />
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router";

defineProps<{
  to: RouteLocationRaw;
}>();
</script>

<style scoped lang="scss">
a {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
