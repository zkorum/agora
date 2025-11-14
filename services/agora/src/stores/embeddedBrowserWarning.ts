import { defineStore } from 'pinia';
import { ref } from 'vue';
import { useStorage } from '@vueuse/core';

export const useEmbeddedBrowserWarningStore = defineStore('embeddedBrowserWarning', () => {
  // State
  const showWarning = ref(false);
  const appName = ref<string | undefined>(undefined);
  const appKey = ref<string | undefined>(undefined);

  // Session-only dismissal (resets when browser tab is closed)
  const dismissedThisSession = useStorage<boolean>(
    'dismissed-embedded-browser-warning-session',
    false,
    sessionStorage
  );

  // Persistent dismissal flag (survives browser close, stored in localStorage)
  const dismissedPermanently = useStorage<boolean>(
    'dismissed-embedded-browser-warning',
    false,
    localStorage
  );

  // Actions
  function openWarning(name: string | undefined, key: string | undefined) {
    // Don't show if already dismissed permanently or in this session
    if (dismissedPermanently.value) {
      console.log('[EmbeddedBrowserWarning] Already dismissed permanently');
      return;
    }

    if (dismissedThisSession.value) {
      console.log('[EmbeddedBrowserWarning] Already dismissed this session');
      return;
    }

    appName.value = name;
    appKey.value = key;
    showWarning.value = true;
  }

  function closeWarning() {
    showWarning.value = false;
    dismissedThisSession.value = true;  // Remember dismissal only for this session
  }

  function reportFalsePositive() {
    console.error('[EmbeddedBrowserWarning] FALSE POSITIVE DETECTED', {
      detectedAppName: appName.value,
      detectedAppKey: appKey.value,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      url: window.location.href,
    });

    showWarning.value = false;
    dismissedPermanently.value = true;  // Dismiss permanently since this was a false positive
  }

  return {
    showWarning,
    appName,
    appKey,
    openWarning,
    closeWarning,
    reportFalsePositive,
  };
});
