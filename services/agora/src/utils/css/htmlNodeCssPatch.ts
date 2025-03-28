import { useQuasar } from "quasar";
import { onMounted } from "vue";

export const useHtmlNodeCssPatch = () => {
  const quasar = useQuasar();

  onMounted(() => {
    if (
      quasar.platform.is.desktop &&
      quasar.platform.is.safari &&
      quasar.platform.is.mac
    ) {
      document.documentElement.style.overscrollBehavior = "auto";
    }
  });
};
