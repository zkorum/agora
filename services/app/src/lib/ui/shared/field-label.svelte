<script lang="ts">
  let {
    text,
    id,
    required = false,
  }: {
    text: string;
    id?: string;
    required?: boolean;
  } = $props();
</script>

<span
  ><span {id}>{text}</span>{#if required}<span
      class="ms-[0.25em] text-red-darkest"
      aria-hidden="true">*</span
    >{/if}</span
>
