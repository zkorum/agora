<script lang="ts">
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
    text-icon-linkedin transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[simple-icons--linkedin] inline-block
      {className}"
  ></span>
</a>
