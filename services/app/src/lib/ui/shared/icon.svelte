<script lang="ts">
  import { iconClasses, type IconName } from "./view-types.js";

  let { name, size = 18 }: { name: IconName; size?: number } = $props();
</script>

<span
  class={[
    iconClasses[name],
    { directional: name === "back" || name === "forward" || name === "panel" },
  ]}
  style:width={`${size}px`}
  style:height={`${size}px`}
  aria-hidden="true"
></span>

<style>
  span {
    display: inline-block;
    flex-shrink: 0;
    vertical-align: middle;
  }

  .directional:dir(rtl) {
    transform: scaleX(-1);
  }
</style>
