import { defineComponent, h } from "vue";
import { QInput } from "quasar";

export default defineComponent({
  setup(props, { slots }) {
    return () =>
      h(
        QInput,
        {
          ...props,
        },
        slots
      );
  },
});
