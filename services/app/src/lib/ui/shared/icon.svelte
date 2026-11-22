<script lang="ts">
  import { iconClasses, type IconName } from "./view-types.js";

  let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<span
  class={[
    iconClasses[name],
    "inline-block size-(--icon-size) shrink-0 align-middle",
    {
      "rtl:-scale-x-100":
        name === "back" || name === "forward" || name === "panel",
    },
  ]}
  style:--icon-size={`${size}px`}
  aria-hidden="true"
></span>
