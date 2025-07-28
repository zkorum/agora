import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import { defineBoot } from "#q-app/wrappers";

import Chip from "primevue/chip";
import InputOtp from "primevue/inputotp";

export default defineBoot(({ app }) => {
  app.use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        darkModeSelector: "light",
        cssLayer: false,
      },
    },
    zIndex: {
      overlay: 2000,
    },
  });

  app.component("Chip", Chip);
  app.component("InputOtp", InputOtp);
});
