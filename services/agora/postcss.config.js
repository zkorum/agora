// https://github.com/michael-ciniawsky/postcss-load-config

import autoprefixer from "autoprefixer";
import rtlcss from "postcss-rtlcss";

export default {
  plugins: [
    // https://github.com/postcss/autoprefixer
    autoprefixer(),

    // https://github.com/elchininet/postcss-rtlcss
    // Generates RTL CSS rules for Arabic, Persian, and Hebrew
    rtlcss(),
  ],
};
