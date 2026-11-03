import { VueQueryPlugin } from "@tanstack/vue-query";
import { queryClient } from "src/utils/query/client";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ app }) => {
  app.use(VueQueryPlugin, {
    queryClient,
  });
});
