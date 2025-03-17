import { onUnmounted, ref } from "vue";
import { onBeforeRouteLeave, RouteLocationNormalized } from "vue-router";

export function useRouteGuard(
  onBeforeUnloadCallback: () => void,
  onBeforeRouteLeaveCallback: (to: RouteLocationNormalized) => boolean
) {
  const grantedRouteLeave = ref(false);

  window.onbeforeunload = () => {
    onBeforeUnloadCallback();
  };

  onUnmounted(() => {
    window.onbeforeunload = () => {};
  });

  onBeforeRouteLeave((to) => {
    return onBeforeRouteLeaveCallback(to);
  });

  return { grantedRouteLeave };
}
