import autoprefixer from "autoprefixer";

export default {
  plugins: [
    autoprefixer({
      overrideBrowserslist: [
        "chrome >= 86",
        "safari >= 14",
        "firefox >= 78",
        "edge >= 88",
        "ios >= 14",
        "and_chr >= 86",
      ],
    }),
  ],
};
