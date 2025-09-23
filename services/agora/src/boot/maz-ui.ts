import { boot } from "quasar/wrappers";
import { MazUi } from "maz-ui/plugins/maz-ui";
import { mazUi } from "@maz-ui/themes/presets";

// Import Maz-UI styles before other CSS
import "maz-ui/styles";

export default boot(({ app }) => {
  app.use(MazUi, {
    theme: {
      preset: mazUi, // Using default mazUi preset
      colorMode: "light",
    },
    // Translations can be added later if needed
    // translations: {
    //   locale: 'en',
    //   fallbackLocale: 'en',
    //   messages: { en },
    // },
  });
});
