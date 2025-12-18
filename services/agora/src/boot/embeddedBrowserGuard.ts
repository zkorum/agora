import InAppSpy from "inapp-spy";
import { Platform } from "quasar";
import { boot } from "quasar/wrappers";
import { useEmbeddedBrowserWarningStore } from "src/stores/embeddedBrowserWarning";

/**
 * Boot file to detect embedded/in-app browsers and redirect users to system browser.
 *
 * Problem: Embedded browsers (Telegram, WeChat, Facebook, Instagram, etc.) have
 * restrictions on iframes, popups, and redirects that break features like Zupass
 * verification. The Zupass email verification flow uses iframe + popup, and
 * redirects leak out to the parent window in embedded browsers.
 *
 * Solution: Detect embedded browsers and redirect to system browser where all
 * features work correctly.
 *
 * IMPORTANT: This guard SKIPS embed routes (/embed) to preserve legitimate
 * iframe embedding functionality for sharing conversations on other websites.
 */
export default boot(({ router }) => {
  // Only run in browser context (not SSR)
  if (typeof window === "undefined") {
    return;
  }

  // CRITICAL: Skip detection for embed routes
  // Embed routes are designed to be embedded in iframes on other websites
  const currentPath = router.currentRoute.value.path;
  if (currentPath.includes("/embed")) {
    console.log(
      "[EmbeddedBrowserGuard] Skipping detection for embed route:",
      currentPath
    );
    return;
  }

  // Detect if running in an in-app browser
  const { isInApp, appKey, appName } = InAppSpy();

  // DEBUG: Log user-agent for all browsers (helpful for debugging X browser)
  const userAgent = navigator.userAgent;
  console.log("[EmbeddedBrowserGuard] User-Agent:", userAgent);
  console.log("[EmbeddedBrowserGuard] Detection result:", {
    isInApp,
    appKey,
    appName,
  });

  if (!isInApp) {
    console.log(
      "[EmbeddedBrowserGuard] Not in embedded browser, continuing normally"
    );
    return;
  }

  console.log(
    "[EmbeddedBrowserGuard] Detected embedded browser:",
    appName,
    `(${appKey})`
  );

  const isWechat = appKey === "wechat";
  const isX = appKey === "twitter";

  // ANDROID: Try Intent URI workaround except on WeChat (does nothing) and X (X would redirect to... X Browser, causing User-Agent to change, X Browser would then not be detected, and therefore causing blink during openeing and allowing users to stay in X browser!
  if (Platform.is.android && !isWechat && !isX) {
    console.log(
      "[EmbeddedBrowserGuard] Android detected - trying Intent URI redirect"
    );

    try {
      // Intent URI scheme forces opening in external browser on Android
      // If this succeeds, browser navigates away and execution stops
      // If it fails, execution continues to show modal
      const url = new URL(window.location.href);
      const intentUrl = `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(":", "")};S.browser_fallback_url=${encodeURIComponent(window.location.href)};end`;
      window.location.href = intentUrl;
    } catch (error) {
      console.error("[EmbeddedBrowserGuard] Intent URI error:", error);
    }
    // Fall through to show modal if Intent didn't navigate away
  }

  // FINAL FALLBACK: Show warning dialog with instructions
  // This runs if:
  // - Android Intent didn't navigate away (non-Android or Intent failed)
  // - Or this is iOS or other platform without programmatic redirect support
  console.log("[EmbeddedBrowserGuard] Showing warning dialog for:", appName);

  const warningStore = useEmbeddedBrowserWarningStore();
  warningStore.openWarning(appName, appKey);
});
