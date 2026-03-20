import { defineBoot } from "#q-app/wrappers";

/**
 * Global SPA link interceptor (capture phase).
 *
 * BUG: Vue 3.5 introduced event delegation (vuejs/core#11765) where click
 * handlers are NOT attached directly to DOM elements (__vei is empty).
 * Instead, they're managed by Vue's runtime on a parent element. For <a>
 * tags, this creates a race condition: the browser can follow the native
 * <a href> link BEFORE Vue's delegated click handler calls preventDefault.
 *
 * SYMPTOMS:
 * - Intermittent full page reloads when clicking <RouterLink> or <a> tags
 * - App restarts from scratch (SSE reconnects, auth re-initializes)
 * - Browser history corrupted (back button goes to wrong page)
 * - Affects all browsers, dev and production
 * - Timing-dependent: sometimes SPA works, sometimes full reload
 *
 * CONFIRMED VIA PLAYWRIGHT:
 * - __vei is empty on ALL elements (Vue 3.5 event delegation)
 * - Vnode props DO have onClick (Vue knows about the handler internally)
 * - Synthetic dispatchEvent works (Vue intercepts synchronously)
 * - Real browser clicks intermittently bypass Vue's delegated handler
 * - Only capture-phase document listener fires; bubble-phase never fires
 *   because the browser already started native navigation
 *
 * FIX: A single capture-phase click listener on document. Capture phase
 * fires BEFORE any element-level or delegated handlers, and BEFORE the
 * browser can follow the native link. This is the same pattern used by
 * Angular's LocationStrategy and SvelteKit's link handling.
 *
 * PRESERVES:
 * - <a href> for accessibility, SEO, right-click "Open in new tab"
 * - Middle-click / Ctrl+click / Cmd+click open in new tab
 * - External links (different origin) are not intercepted
 * - target="_blank" and download links are not intercepted
 *
 * REFERENCES:
 * - Vue 3.5 event delegation: https://github.com/vuejs/core/pull/11765
 * - RouterLink reload bug: https://github.com/vuejs/router/issues/846
 * - RouterLink click event: https://github.com/vuejs/router/issues/856
 */
export default defineBoot(({ router }) => {
  document.addEventListener("click", (e: MouseEvent) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const anchor = (e.target as HTMLElement).closest?.("a[href]");
    if (!(anchor instanceof HTMLAnchorElement)) return;
    if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
    if (!anchor.href.startsWith(window.location.origin)) return;
    // Skip entirely if click target is an interactive element inside the <a>.
    // These elements have their own @click.stop handlers (e.g., share, vote count,
    // hamburger menu). We must not call e.preventDefault() here — that would
    // interfere with Vue's event delegation for the button handlers.
    // Browsers give priority to inner interactive elements over the outer <a>.
    const target = e.target as HTMLElement;
    const interactive = target.closest("button, [role='button'], input, select, textarea");
    if (interactive && anchor.contains(interactive)) return;
    e.preventDefault();
    // Deferred SpaLinks (data-spa-handled) handle their own navigation —
    // used by analysis/comment tabs that need custom history management.
    // See SpaLink.vue for the two-mode explanation.
    if (anchor.hasAttribute("data-spa-handled")) return;
    const url = new URL(anchor.href);
    void router.push(url.pathname + url.search + url.hash);
  }, true);
});
