import { boot } from "quasar/wrappers";
import { Platform } from "quasar";
import InAppSpy from "inapp-spy";
import { useEmbeddedBrowserWarningStore, type AppKey } from "src/stores/embeddedBrowserWarning";

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
  let usedIsInApp = isInApp;
  let usedAppKey: AppKey = appKey;
  let usedAppName: string | undefined = appName;

  // DEBUG: Log user-agent for all browsers (helpful for debugging X browser)
  const userAgent = navigator.userAgent;
  console.log("[EmbeddedBrowserGuard] User-Agent:", userAgent);
  console.log("[EmbeddedBrowserGuard] Detection result:", {
    usedIsInApp,
    usedAppKey,
    usedAppName,
  });

  // CUSTOM X BROWSER DETECTION
  // X browser doesn't identify itself in user-agent, so use multiple heuristics
  if (!usedIsInApp) {
    // Method 1: User-agent patterns
    // iOS: "Twitter for iPhone" (confirmed in testing)
    // Android: No user-agent identifier (use referrer instead)
    const xBrowserPatterns = [
      /\bTwitter for (iPhone|iPad)\b/i, // iOS: "Twitter for iPhone/iPad"
      /\bTwitter\b/i, // Fallback: just "Twitter" word
    ];

    const hasXUserAgent = xBrowserPatterns.some((pattern) =>
      pattern.test(userAgent)
    );

    // Method 2: Check referrer for X/Twitter
    // Android app: android-app://com.twitter.android
    // iOS/Web: https://t.co/, https://x.com/, or https://twitter.com/
    const referrer = document.referrer || "";
    const hasXReferrer =
      /android-app:\/\/com\.twitter/i.test(referrer) || // Android app
      /\/\/(t\.co|x\.com|twitter\.com)\//i.test(referrer); // Web URLs

    // Method 3: Generic webview detection + heuristics
    // X uses a generic Chrome webview that doesn't expose typical browser features

    // Method 4: Check if mobile device
    const isMobileDevice = Platform.is.mobile;

    // Detect X if: (user-agent OR referrer matches) AND it's a mobile device
    // iOS: "Twitter" in user-agent + mobile
    // Android: android-app referrer + mobile
    // Desktop: Never detected (even with t.co referrer, since isMobileDevice=false)
    const isLikelyXBrowser = (hasXUserAgent || hasXReferrer) && isMobileDevice;

    if (isLikelyXBrowser) {
      console.log("[EmbeddedBrowserGuard] X browser detected");

      // Override InAppSpy result
      usedIsInApp = true;
      usedAppKey = "twitter";
      usedAppName = "X"; // Display as "X" to users
    }
  }

  if (!usedIsInApp) {
    console.log(
      "[EmbeddedBrowserGuard] Not in embedded browser, continuing normally"
    );
    return;
  }

  console.log(
    "[EmbeddedBrowserGuard] Detected embedded browser:",
    usedAppName,
    `(${usedAppKey})`
  );

  // ANDROID: Try Intent URI workaround (fragile but worth trying)
  if (Platform.is.android) {
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
  console.log("[EmbeddedBrowserGuard] Showing warning dialog for:", usedAppName);

  const warningStore = useEmbeddedBrowserWarningStore();
  warningStore.openWarning(usedAppName, usedAppKey);
});
