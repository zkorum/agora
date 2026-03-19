<template>
  <!--
    SpaLink: A RouterLink wrapper that guarantees SPA navigation.

    WHY THIS EXISTS:
    Vue 3.5+ (version 3.5.29 confirmed) uses event delegation for ALL event
    handlers, including @click. Event handlers are NOT attached directly to DOM
    elements (no __vei entries). Instead, they're managed internally by Vue's
    runtime via a delegated handler on a parent element.

    For <a href="..."> tags, this creates a race condition with the browser's
    native link-following behavior:
    1. User clicks the <a> tag
    2. Browser sees a trusted click on an <a> with an href
    3. Vue's delegated click handler needs to call preventDefault()
    4. If the browser processes the native link BEFORE Vue's delegated handler
       fires → full page reload instead of SPA navigation

    This is intermittent and timing-dependent. It was confirmed via Playwright
    testing and manual browser testing across Chrome, Safari, and production.
    It affects ALL <a>-based RouterLinks in Vue 3.5+ apps.

    EVIDENCE (from Playwright investigation):
    - __vei is empty on ALL elements in the DOM (Vue 3.5 event delegation)
    - Vnode props DO have onClick (Vue knows about the handler internally)
    - dispatchEvent() synthetic clicks work (Vue intercepts synchronously)
    - Real browser clicks intermittently bypass Vue's delegated handler
    - Only the capture-phase document listener fires; the bubble-phase listener
      never fires because the browser already started native navigation

    THE FIX:
    This component uses a raw addEventListener('click', ...) attached DIRECTLY
    to the <a> DOM element, bypassing Vue's event delegation entirely. This
    ensures preventDefault() is called immediately when the click fires on
    the element, before the browser can follow the native link.

    WHAT IT PRESERVES:
    - <a href="..."> for accessibility, SEO, right-click "Open in new tab"
    - Middle-click / Ctrl+click / Cmd+click open in new tab (modifier key check)
    - RouterLink's computed href resolution (via custom v-slot)
    - SPA navigation via router.push()

    KNOWN ISSUE / REFERENCES:
    - Vue 3.5 event delegation: https://github.com/vuejs/core/pull/11765
    - Vue Router issues #846, #856: RouterLink + @click causes full page reload
    - Similar to React 17's event delegation issues with <a> tags
    - Search: "vue 3.5 event delegation RouterLink click full page reload"

    USE THIS COMPONENT instead of <RouterLink> for any navigation link
    that must guarantee SPA behavior. Standard <RouterLink> may intermittently
    cause full page reloads in Vue 3.5+.
  -->
  <a ref="linkEl" :href="resolvedHref" :class="linkClass">
    <slot />
  </a>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { type RouteLocationRaw, useRouter } from "vue-router";

const props = defineProps<{
  to: RouteLocationRaw;
  linkClass?: string;
}>();

const router = useRouter();

const resolvedHref = computed(() => router.resolve(props.to).href);

const linkEl = ref<HTMLAnchorElement | null>(null);

onMounted(() => {
  if (!linkEl.value) return;
  linkEl.value.addEventListener("click", (e: MouseEvent) => {
    // Allow modifier-key clicks to open in new tab (standard browser behavior)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return;
    }
    e.preventDefault();
    void router.push(props.to);
  });
});
</script>

<style scoped lang="scss">
a {
  display: block;
  text-decoration: none;
  color: inherit;
  cursor: pointer;
}
</style>
