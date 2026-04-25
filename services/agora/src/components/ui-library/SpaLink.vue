<template>
  <!--
    SpaLink: Reliable internal navigation link.

    WHY THIS EXISTS:
    Vue 3.5 introduced event delegation (vuejs/core#11765) where click
    handlers are NOT attached directly to DOM elements. For <a> tags, this
    races with the browser's native link following, causing intermittent
    full page reloads instead of SPA navigation.
    - Vue 3.5 event delegation: https://github.com/vuejs/core/pull/11765
    - RouterLink reload bug: https://github.com/vuejs/router/issues/846
    - RouterLink click event: https://github.com/vuejs/router/issues/856
    See boot/spaLinkInterceptor.ts for the full root cause analysis.

    TWO MODES (controlled by the `deferred` prop):

    Default (deferred=false): The global capture-phase interceptor in
    boot/spaLinkInterceptor.ts handles both e.preventDefault() and
    router.push(). @click="navigate" is a belt-and-suspenders fallback.
    Use for: feed cards, profile statements, notifications, banners.

    Deferred (deferred=true): The interceptor only does e.preventDefault()
    (via data-spa-handled). Navigation is handled here via handleClick,
    or by a parent's @click handler (detected via $attrs). Use for:
    analysis/comment tabs that need custom history management
    (canGoBackToComment, router.back()) which would conflict with the
    interceptor's router.push().

    Use instead of <RouterLink> for critical navigation links.
  -->
  <RouterLink v-slot="{ href, navigate }" :to="to" :replace="replace" custom>
    <a
      ref="anchorRef"
      :href="href"
      v-bind="$attrs"
      @click="deferred ? handleClick($event) : navigate($event)"
    >
      <slot />
    </a>
  </RouterLink>
</template>

<script setup lang="ts">
import { onMounted, ref, useAttrs } from "vue";
import { type RouteLocationRaw, useRouter } from "vue-router";

defineOptions({ inheritAttrs: false });

const props = withDefaults(defineProps<{
  to: RouteLocationRaw;
  deferred?: boolean;
  replace?: boolean;
}>(), {
  deferred: false,
  replace: false,
});

const router = useRouter();
const attrs = useAttrs();
const anchorRef = ref<HTMLAnchorElement | null>(null);

// Set data attribute via DOM to avoid vue-tsc rejecting custom data-* on <a>
onMounted(() => {
  if (props.deferred) {
    anchorRef.value?.setAttribute("data-spa-handled", "");
  }
});

function handleClick(e: MouseEvent): void {
  // If parent passed its own @click handler (via $attrs), let it handle navigation
  if ("onClick" in attrs) return;
  // Middle-click, ctrl+click, etc. — let browser open in new tab natively
  if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
  void (props.replace ? router.replace(props.to) : router.push(props.to));
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
