// https://github.com/michael-ciniawsky/postcss-load-config

import autoprefixer from "autoprefixer";
import rtlcss from "postcss-rtlcss";

export default {
  plugins: [
    // https://github.com/postcss/autoprefixer
    autoprefixer({
      overrideBrowserslist: [
        "last 4 Chrome versions",
        "last 4 Firefox versions",
        "last 4 Edge versions",
        "last 4 Safari versions",
        "last 4 Android versions",
        "last 4 ChromeAndroid versions",
        "last 4 FirefoxAndroid versions",
        "last 4 iOS versions",
      ],
    }),

    // https://github.com/elchininet/postcss-rtlcss
    // Generates RTL CSS rules for Arabic, Persian, and Hebrew
    rtlcss(),
  ],
};
