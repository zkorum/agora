<script lang="ts">
  import * as m from "$lib/paraglide/messages.js";
  import GradientButton from "$ui/shared/gradient-button.svelte";
  import GradientText from "$ui/shared/gradient-text.svelte";
  import Text from "$ui/shared/text.svelte";
</script>

<section
  id="pricing"
  class="
    px-4 py-20
    sm:px-8
  "
>
  <div class="mx-auto max-w-[1120px]">
    <Text size="base" weight="bold" class="mb-2 text-center">
      <GradientText angle={174}>{m.pricing_label()}</GradientText>
    </Text>
    <Text size="base" class="mb-12 text-center text-secondary-foreground">
      {m.pricing_subtitle()}
    </Text>

    <div
      class="
        flex flex-col gap-4
        md:flex-row
      "
    >
      <!-- Tier 1: Agora Lite -->
      <div
        class="
          flex flex-1 flex-col rounded-2xl border border-border p-4
          sm:p-6
        "
      >
        <Text size="xl" weight="bold">
          <GradientText>{m.pricing_lite_name()}</GradientText>
        </Text>
        <Text size="sm" leading="tight" class="mt-1">
          {m.pricing_lite_desc()}
        </Text>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_lite_feature_1()}
            </Text>
          </div>
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_lite_feature_2()}
            </Text>
          </div>
        </div>
      </div>

      <!-- Tier 2: Agora Pro -->
      <div
        class="
          flex flex-1 flex-col rounded-2xl border border-border p-4
          sm:p-6
        "
      >
        <Text size="xl" weight="bold">
          <GradientText>{m.pricing_pro_name()}</GradientText>
        </Text>
        <Text size="sm" leading="tight" class="mt-1">
          {m.pricing_pro_desc()}
        </Text>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_pro_feature_1()}
            </Text>
          </div>
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_pro_feature_2()}
            </Text>
          </div>
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_pro_feature_3()}
            </Text>
          </div>
        </div>
      </div>

      <!-- Tier 3: Facilitation & Consulting -->
      <div
        class="
          flex flex-1 flex-col rounded-2xl border border-border p-4
          sm:p-6
        "
      >
        <Text size="xl" weight="bold">
          <GradientText>{m.pricing_consulting_name()}</GradientText>
        </Text>
        <Text size="sm" leading="tight" class="mt-1">
          {m.pricing_consulting_desc()}
        </Text>
        <div class="mt-4 flex flex-col pb-10">
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_consulting_feature_1()}
            </Text>
          </div>
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_consulting_feature_2()}
            </Text>
          </div>
          <div class="flex items-start gap-2">
            <GradientText angle={107} class="text-xl">✓</GradientText>
            <Text
              size="sm"
              leading="tight"
              element="span"
              class="text-secondary-foreground"
            >
              {m.pricing_consulting_feature_3()}
            </Text>
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
