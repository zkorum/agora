import { useRouteStateStore } from "src/stores/routeState";
import { useRouter } from "vue-router";

export function useGoBackButtonHandler() {
  const router = useRouter();

  const routeStateStore = useRouteStateStore();

  async function goBack() {
    const goBackObject = await routeStateStore.goBack();
    if (goBackObject.useSpecialRoute) {
      if (goBackObject.routeName) {
        const routeObj = router.resolve({ name: goBackObject.routeName });
        await router.push(routeObj);
      }
    } else {
      router.go(-1);
    }
  }

  return { goBack };
}
