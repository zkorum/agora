<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
</script>

<section id="pricing" class="px-8 py-20">
  <div class="mx-auto max-w-[1120px]">
    <p class="mb-2 text-center text-base font-bold tracking-tight">
      <GradientText angle={174}>{m.pricing_label()}</GradientText>
    </p>
    <p class="mb-12 text-center text-base tracking-tight text-text-secondary">
      {m.pricing_subtitle()}
    </p>

    <div
      class="
        flex flex-col gap-4
        md:flex-row
      "
    >
      <!-- Tier 1: Agora Lite -->
      <div class="flex flex-1 flex-col rounded-2xl border border-border p-6">
        <p class="text-2xl/tight font-bold tracking-tight text-text-primary">
          {m.pricing_lite_name()}
        </p>
        <p class="mt-1 text-sm/4 tracking-tight text-text-primary">
          {m.pricing_lite_desc()}
        </p>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_lite_feature_1()}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_lite_feature_2()}
            </span>
          </div>
        </div>
      </div>

      <!-- Tier 2: Agora Pro -->
      <div class="flex flex-1 flex-col rounded-2xl border border-border p-6">
        <p class="text-2xl/tight font-bold tracking-tight text-text-primary">
          {m.pricing_pro_name()}
        </p>
        <p class="mt-1 text-sm/4 tracking-tight text-text-primary">
          {m.pricing_pro_desc()}
        </p>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_pro_feature_1()}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_pro_feature_2()}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_pro_feature_3()}
            </span>
          </div>
        </div>
      </div>

      <!-- Tier 3: Facilitation & Consulting -->
      <div class="flex flex-1 flex-col rounded-2xl border border-border p-6">
        <p class="text-2xl/tight font-bold tracking-tight text-text-primary">
          {m.pricing_consulting_name()}
        </p>
        <p class="mt-1 text-sm/4 tracking-tight text-text-primary">
          {m.pricing_consulting_desc()}
        </p>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_consulting_feature_1()}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_consulting_feature_2()}
            </span>
          </div>
          <div class="flex items-center gap-2">
            <GradientText angle={107} class="text-[22px] leading-relaxed"
              >✓</GradientText
            >
            <span class="text-sm/4 tracking-tight text-text-secondary">
              {m.pricing_consulting_feature_3()}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div class="mt-8 flex justify-center">
      <GradientButton
        href="https://linktr.ee/yuting_jiang"
        target="_blank"
        rel="noopener noreferrer"
        variant="primary"
      >
        {m.pricing_cta()}
      </GradientButton>
    </div>
  </div>
</section>
