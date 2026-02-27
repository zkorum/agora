import { definePreset } from "@maz-ui/themes";
import { mazUi } from "@maz-ui/themes/presets/mazUi";

export const agoraPreset = definePreset({
  base: mazUi,
  overrides: {
    name: "agora",
    foundation: {
      "base-font-size": "16px",
      "font-family":
        "AlbertSans, InterSans, system-ui, -apple-system, sans-serif",
      radius: "0.7rem",
      "border-width": "1px",
    },
    colors: {
      light: {
        background: "0 0% 100%", // #ffffff
        foreground: "214 13% 23%", // rgb(51, 61, 66) - $color-text-strong
        primary: "252 100% 65%", // #6b4eff
        "primary-foreground": "0 0% 100%",
        secondary: "174 62% 40%", // #26a69a
        "secondary-foreground": "0 0% 100%",
        accent: "193 82% 31%", // #0e7490
        "accent-foreground": "0 0% 100%",
        success: "134 70% 43%", // #21ba45
        "success-foreground": "0 0% 100%",
        warning: "32 93% 56%", // #f79327
        "warning-foreground": "214 13% 23%",
        destructive: "4 89% 44%", // #d3180c
        "destructive-foreground": "0 0% 100%",
        info: "190 82% 56%", // #31ccec
        "info-foreground": "0 0% 100%",
        contrast: "0 0% 11%", // #1d1d1d - $dark
        "contrast-foreground": "0 0% 95%",
        border: "0 0% 88%", // #e0e0e0 - $color-border-weak
        overlay: "0 0% 40%",
        muted: "200 11% 41%", // rgb(92, 108, 116) - $color-text-weak
        shadow: "240 6% 10%",
      },
      dark: {
        background: "0 0% 7%", // #121212 - $dark-page
        foreground: "0 0% 85%",
        primary: "252 100% 65%", // #6b4eff
        "primary-foreground": "0 0% 100%",
        secondary: "174 62% 40%",
        "secondary-foreground": "0 0% 100%",
        accent: "193 82% 31%",
        "accent-foreground": "0 0% 100%",
        success: "134 70% 43%",
        "success-foreground": "0 0% 100%",
        warning: "32 93% 56%",
        "warning-foreground": "214 13% 23%",
        destructive: "4 89% 55%",
        "destructive-foreground": "0 0% 100%",
        info: "190 82% 56%",
        "info-foreground": "0 0% 100%",
        contrast: "0 0% 100%",
        "contrast-foreground": "214 13% 23%",
        muted: "0 0% 54%",
        border: "0 0% 25%",
        overlay: "0 0% 15%",
        shadow: "240 4% 16%",
      },
    },
  },
});
