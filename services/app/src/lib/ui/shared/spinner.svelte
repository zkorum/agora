<script lang="ts">
  let { size = 16 }: { size?: number } = $props();
</script>

<span
  class="
    inline-block size-(--size) shrink-0 animate-spin rounded-full border-2
    border-current border-e-transparent [animation-duration:0.75s]
    motion-reduce:animate-none
  "
  aria-hidden="true"
  style:--size={`${size}px`}
></span>
