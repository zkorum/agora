import { shouldReloadForEmailUpdateRecipientAction } from "src/utils/privacy/emailUpdateRecipientPath";

import { defineBoot } from "#q-app/wrappers";

export default defineBoot(({ router }) => {
  router.beforeEach((to) => {
    if (
      shouldReloadForEmailUpdateRecipientAction({
        currentPathname: window.location.pathname,
        targetPathname: to.path,
      })
    ) {
      window.location.assign(to.fullPath);
      return false;
    }
  });
});
