export const sentryEnabled =
  import.meta.env.PROD &&
  import.meta.env.VITE_SENTRY_ENABLED === "true" &&
  import.meta.env.VITE_STAGING !== "true";
