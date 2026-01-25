<script lang="ts">
  import IconLinkedin from "~icons/simple-icons/linkedin";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://www.linkedin.com/company/agoracitizennetwork"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="LinkedIn"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #0A66C2;"
>
  <IconLinkedin class={className} />
</a>
