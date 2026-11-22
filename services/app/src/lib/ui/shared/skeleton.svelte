<script lang="ts">
  let { class: className = "" }: { class?: string } = $props();
</script>

<div
  aria-hidden="true"
  class={[
    `
      min-h-4 animate-[pulse_3s_ease-in-out_infinite]
      rounded-(--skeleton-radius,0.5rem) bg-sky-lighter
      motion-reduce:animate-none
    `,
    className,
  ]}
></div>
