import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import PrimeVue from "primevue/config";

import { defineBoot } from "#q-app/wrappers";

const customPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#f3f1ff",
      100: "#e9e5ff",
      200: "#d6ccff",
      300: "#baa7ff",
      400: "#9a75ff",
      500: "#6b4eff",
      600: "#5d42e6",
      700: "#4f35cc",
      800: "#422cb3",
      900: "#382899",
      950: "#241a66",
    },
  },
  primitive: {
    borderRadius: {
      xs: "15px",
      sm: "15px",
      md: "15px",
      lg: "15px",
      xl: "15px",
    },
  },
  components: {
    button: {
      css: () => `
        .p-button {
          font-size: 0.9rem;
          padding-left: 1rem;
          padding-right: 1rem;
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
        }
      `,
    },
  },
});

export default defineBoot(({ app }) => {
  app.use(PrimeVue, {
    theme: {
      preset: customPreset,
      options: {
        darkModeSelector: false,
        cssLayer: false,
      },
    },
    zIndex: {
      overlay: 2000,
    },
  });
});
