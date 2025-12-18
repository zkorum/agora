import { VueQueryPlugin } from "@tanstack/vue-query";
import { boot } from "quasar/wrappers";
import { queryClient } from "src/utils/query/client";

export default boot(({ app }) => {
  app.use(VueQueryPlugin, {
    queryClient,
  });
});
