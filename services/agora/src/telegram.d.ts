// Telegram WebApp types
// Reference: https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/telegram-web-app
// Note: We use minimal custom types here instead of @types/telegram-web-app because the official
// package incorrectly declares window.Telegram as always present (non-optional).

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
      };
    };
  }
}

export {};
