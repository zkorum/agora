<script lang="ts">
  import * as m from "#lib/paraglide/messages.js";
  import LiteYoutube from "$components/shared/lite-youtube.svelte";
</script>

<section class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <div class="overflow-hidden rounded-2xl">
      <LiteYoutube
        videoid="FHpcdHiyCXw"
        videotitle={m.video_title()}
        poster="/images/resources/ethprague-broad-listening.jpg"
      />
    </div>
  </div>
</section>
