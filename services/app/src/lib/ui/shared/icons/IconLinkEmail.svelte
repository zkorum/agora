<script lang="ts">
  import IconMail from "~icons/lucide/mail";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="mailto:hello@zkorum.com"
  aria-label="Email"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #333238;"
>
  <IconMail class={className} />
</a>
