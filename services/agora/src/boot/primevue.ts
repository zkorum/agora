import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";
import Button from "primevue/button";
import Card from "primevue/card";
import Chip from "primevue/chip";
import PrimeVue from "primevue/config";
import DatePicker from "primevue/datepicker";
import FileUpload from "primevue/fileupload";
import IconField from "primevue/iconfield";
import InputIcon from "primevue/inputicon";
import InputOtp from "primevue/inputotp";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import ProgressSpinner from "primevue/progressspinner";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Divider from "primevue/divider";

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

  app.component("PrimeButton", Button);
  app.component("PrimeCard", Card);
  app.component("PrimeChip", Chip);
  app.component("PrimeDatePicker", DatePicker);
  app.component("PrimeSelect", Select);
  app.component("PrimeInputOtp", InputOtp);
  app.component("PrimeInputText", InputText);
  app.component("PrimeIconField", IconField);
  app.component("PrimeInputIcon", InputIcon);
  app.component("PrimeFileUpload", FileUpload);
  app.component("PrimeProgressSpinner", ProgressSpinner);
  app.component("PrimeMessage", Message);
  app.component("PrimeTag", Tag);
  app.component("PrimeDivider", Divider);
});
