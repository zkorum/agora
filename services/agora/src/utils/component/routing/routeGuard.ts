import { onUnmounted } from "vue";
import { onBeforeRouteLeave, RouteLocationNormalized } from "vue-router";

export function useRouteGuard(
  onBeforeUnloadCallback: () => void,
  onBeforeRouteLeaveCallback: (to: RouteLocationNormalized) => boolean
) {
  window.onbeforeunload = () => {
    onBeforeUnloadCallback();
  };

  onUnmounted(() => {
    window.onbeforeunload = () => {};
  });

  onBeforeRouteLeave((to) => {
    return onBeforeRouteLeaveCallback(to);
  });
}
