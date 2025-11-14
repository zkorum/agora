import { boot } from 'quasar/wrappers';
import { Platform } from 'quasar';
import InAppSpy from 'inapp-spy';
import { useEmbeddedBrowserWarningStore } from 'src/stores/embeddedBrowserWarning';

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
  if (typeof window === 'undefined') {
    return;
  }

  // CRITICAL: Skip detection for embed routes
  // Embed routes are designed to be embedded in iframes on other websites
  const currentPath = router.currentRoute.value.path;
  if (currentPath.includes('/embed')) {
    console.log('[EmbeddedBrowserGuard] Skipping detection for embed route:', currentPath);
    return;
  }

  // Detect if running in an in-app browser
  const { isInApp, appKey, appName } = InAppSpy();

  if (!isInApp) {
    console.log('[EmbeddedBrowserGuard] Not in embedded browser, continuing normally');
    return;
  }

  console.log('[EmbeddedBrowserGuard] Detected embedded browser:', appName, `(${appKey})`);

  // TELEGRAM: Try Telegram WebApp API first
  if (appKey === 'telegram') {
    try {
      const telegramWebApp = window.Telegram?.WebApp;

      if (telegramWebApp && typeof telegramWebApp.openLink === 'function') {
        console.log('[EmbeddedBrowserGuard] Telegram detected - attempting openLink redirect');

        // Telegram provides API to open links in system browser
        // If this succeeds, browser navigates away and execution stops
        // If it fails silently, execution continues to fallback
        telegramWebApp.openLink(window.location.href, {
          try_instant_view: false, // Don't use Telegram's instant view
        });
      } else {
        console.log('[EmbeddedBrowserGuard] Telegram WebApp API not available');
      }
    } catch (error) {
      console.error('[EmbeddedBrowserGuard] Telegram openLink error:', error);
    }
    // Always fall through to try Android Intent or show modal
  }

  // ANDROID: Try Intent URI workaround (fragile but worth trying)
  if (Platform.is.android) {
    console.log('[EmbeddedBrowserGuard] Android detected - trying Intent URI redirect');

    try {
      // Intent URI scheme forces opening in external browser on Android
      // If this succeeds, browser navigates away and execution stops
      // If it fails, execution continues to show modal
      const intentUrl = `intent:${window.location.href}#Intent;scheme=https;end`;
      window.location.href = intentUrl;
    } catch (error) {
      console.error('[EmbeddedBrowserGuard] Intent URI error:', error);
    }
    // Fall through to show modal if Intent didn't navigate away
  }

  // FINAL FALLBACK: Show warning dialog with instructions
  // This runs if:
  // - Telegram API didn't navigate away
  // - Android Intent didn't navigate away
  // - Or this is a non-Telegram, non-Android browser
  console.log('[EmbeddedBrowserGuard] Showing warning dialog for:', appName);

  const warningStore = useEmbeddedBrowserWarningStore();
  warningStore.openWarning(appName, appKey);
});
