<script lang="ts">
  import IconGithub from "~icons/simple-icons/github";

  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://github.com/zkorum"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="GitHub"
  class="
    transition-opacity duration-200
    hover:opacity-70
  "
  style="color: #181717;"
>
  <IconGithub class={className} />
</a>
