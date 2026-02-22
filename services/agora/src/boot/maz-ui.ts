import { MazUiTranslations } from "@maz-ui/translations";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  app.use(MazUiTranslations);
});
