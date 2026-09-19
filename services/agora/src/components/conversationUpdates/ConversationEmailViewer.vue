<template>
  <div class="email-viewer">
    <SandboxedHtmlFrame
      mode="static"
      :title="title"
      :source="{ kind: 'html', html: email.html }"
      class="email-viewer__frame"
    />
    <details class="email-viewer__text">
      <summary>text/plain</summary>
      <pre :lang="language" :dir="getLanguageTextDirection(language)">{{
        email.text
      }}</pre>
    </details>
  </div>
</template>

<script setup lang="ts">
import SandboxedHtmlFrame from "src/components/ui-library/SandboxedHtmlFrame.vue";
import {
  getLanguageTextDirection,
  type SupportedDisplayLanguageCodes,
} from "src/shared/languages";
import type { Dto } from "src/shared/types/dto";
defineProps<{
  email: ReturnType<typeof Dto.conversationEmailUpdatePreview.parse>;
  title: string;
  language: SupportedDisplayLanguageCodes;
}>();
</script>

<style scoped lang="scss">
.email-viewer {
  min-width: 0;

  &__frame {
    display: block;
    width: 100%;
    height: 38rem;
    max-height: 75vh;
    border: 0;
  }

  &__text {
    padding: 1rem;

    summary {
      cursor: pointer;
    }

    pre {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font-size: 0.85rem;
    }
  }
}
</style>
