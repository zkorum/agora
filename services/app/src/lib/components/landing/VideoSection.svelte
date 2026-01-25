<script lang="ts">
  import LiteYoutube from "$lib/components/shared/LiteYoutube.svelte";
  import * as m from "$lib/paraglide/messages.js";
</script>

<section class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <div class="overflow-hidden rounded-2xl">
      <LiteYoutube videoid="phw1AlQs8DY" videotitle={m.video_title()} />
    </div>
  </div>
</section>
