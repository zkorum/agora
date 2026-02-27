import { MazUi } from "maz-ui/plugins/maz-ui";
import { agoraPreset } from "src/themes/maz-ui-agora-preset";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  app.use(MazUi, {
    theme: {
      preset: agoraPreset,
    },
  });
});
