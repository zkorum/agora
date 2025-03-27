import { onUnmounted, ref } from "vue";
import {
  onBeforeRouteLeave,
  RouteLocationNormalized,
  useRouter,
} from "vue-router";

export function useRouteGuard(
  onBeforeUnloadCallback: () => string | undefined,
  onBeforeRouteLeaveCallback: (to: RouteLocationNormalized) => boolean
) {
  const grantedRouteLeave = ref(false);
  const showExitDialog = ref(false);

  const router = useRouter();

  const savedToRoute = ref<RouteLocationNormalized>({
    matched: [],
    fullPath: "",
    query: {},
    hash: "",
    name: "/",
    path: "",
    meta: {},
    params: {},
    redirectedFrom: undefined,
  });

  window.onbeforeunload = () => {
    return onBeforeUnloadCallback();
  };

  onUnmounted(() => {
    window.onbeforeunload = () => {};
  });

  onBeforeRouteLeave((to) => {
    return onBeforeRouteLeaveCallback(to);
  });

  async function leaveRoute(beforeLeaveCallback: () => void) {
    grantedRouteLeave.value = true;
    beforeLeaveCallback();
    await router.push(savedToRoute.value);
  }

  function lockRoute() {
    grantedRouteLeave.value = false;
  }

  function unlockRoute() {
    grantedRouteLeave.value = true;
  }

  function isLockedRoute() {
    return grantedRouteLeave.value == false;
  }

  return {
    lockRoute,
    unlockRoute,
    isLockedRoute,
    savedToRoute,
    showExitDialog,
    leaveRoute,
  };
}
