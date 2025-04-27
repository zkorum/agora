import { useRouteStateStore } from "src/stores/routeState";
import { useRouter } from "vue-router";

export function useGoBackButtonHandler() {
  const router = useRouter();

  const routeStateStore = useRouteStateStore();

  async function goBack() {
    const goBackObject = routeStateStore.goBack();
    if (goBackObject.useSpecialRoute) {
      console.log(goBackObject.routeItem.name);
      const routeObj = router.resolve({
        name: goBackObject.routeItem.name,
        params: goBackObject.routeItem.params,
        query: goBackObject.routeItem.query,
      });
      await router.push(routeObj);
    } else {
      router.go(-1);
    }
  }

  return { goBack };
}
