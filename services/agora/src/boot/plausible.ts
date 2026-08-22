import { isEmailUpdateRecipientActionPath } from "src/utils/privacy/emailUpdateRecipientPath";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ router }) => {
  router.afterEach((to) => {
    if (
      window.plausible !== undefined &&
      !isEmailUpdateRecipientActionPath(to.path)
    ) {
      window.plausible("pageview");
    }
  });
});
