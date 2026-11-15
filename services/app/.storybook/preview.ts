import "@fontsource-variable/albert-sans";
import "../src/app.css";

import type { Preview } from "@storybook/svelte-vite";

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    options: {
      storySort: { order: ["Agora", "Shared"] },
    },
  },
};

export default preview;
