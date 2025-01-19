import PrimeVue from "primevue/config";
import Aura from "@primevue/themes/aura";
import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  // something to do
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
});
