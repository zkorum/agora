<script lang="ts">
  interface Props {
    class?: string;
  }

  let { class: className = "h-6 w-6" }: Props = $props();
</script>

<a
  href="https://bsky.app/profile/did:plc:dvf26c5a45e4hpxmwwig32jd"
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Bluesky"
  class="
    text-icon-bluesky transition-opacity duration-200
    hover:opacity-70
  "
>
  <span
    class="
      icon-[simple-icons--bluesky] inline-block
      {className}"
  ></span>
</a>
