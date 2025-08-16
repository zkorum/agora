import PrimeVue from "primevue/config";
import Aura from "@primeuix/themes/aura";
import { defineBoot } from "#q-app/wrappers";

import Button from "primevue/button";
import Chip from "primevue/chip";
import DatePicker from "primevue/datepicker";
import InputOtp from "primevue/inputotp";
import InputText from "primevue/inputtext";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";

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

  app.component("PrimeButton", Button);
  app.component("PrimeChip", Chip);
  app.component("PrimeDatePicker", DatePicker);
  app.component("PrimeInputOtp", InputOtp);
  app.component("PrimeInputText", InputText);
  app.component("PrimeIconField", IconField);
  app.component("PrimeInputIcon", InputIcon);
});
