import { defineComponent, h } from "vue";
import { QBtn } from "quasar";

export default defineComponent({
  setup(props, { slots }) {
    return () =>
      h(
        QBtn,
        {
          ...props,
          noCaps: true,
          rounded: true,
          unelevated: true,
        },
        slots
      );
  },
});
