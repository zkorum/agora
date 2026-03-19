<template>
  <!--
    SpaLink: Reliable internal navigation link.

    Renders an <a> with the correct href for accessibility, SEO, and
    middle-click support. The global capture-phase interceptor in
    boot/spaLinkInterceptor.ts calls e.preventDefault() to prevent the
    Vue 3.5 event delegation race with native <a href> following.

    Navigation is handled here (not by the interceptor) via handleClick.
    When a parent passes @click through $attrs, SpaLink defers to the
    parent's handler — the parent is responsible for calling router.push().

    Use instead of <RouterLink> for critical navigation links.
  -->
  <RouterLink v-slot="{ href }" :to="to" custom>
    <a ref="anchorRef" :href="href" v-bind="$attrs" @click="handleClick">
      <slot />
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import { onMounted, ref, useAttrs } from "vue";
import { type RouteLocationRaw, useRouter } from "vue-router";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  to: RouteLocationRaw;
}>();

const router = useRouter();
const attrs = useAttrs();
const anchorRef = ref<HTMLAnchorElement | null>(null);

// Set data attribute via DOM to avoid vue-tsc rejecting custom data-* on <a>
onMounted(() => {
  anchorRef.value?.setAttribute("data-spa-handled", "");
});

function handleClick(e: MouseEvent): void {
  // If parent passed its own @click handler (via $attrs), let it handle navigation
  if ("onClick" in attrs) return;
  // Middle-click, ctrl+click, etc. — let browser open in new tab natively
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  void router.push(props.to);
}
</script>

<style scoped lang="scss">
a {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
