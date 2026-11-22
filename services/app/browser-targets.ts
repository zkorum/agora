import type { BuildOptions } from "vite";

// Sentry 11 no longer supports Safari/iOS Safari 14. Keep JS and CSS aligned.
const browserTargets = ["es2020", "chrome86", "safari15", "firefox91"];

export const browserBuildOptions = {
  target: browserTargets,
  cssTarget: browserTargets,
} satisfies Pick<BuildOptions, "target" | "cssTarget">;
