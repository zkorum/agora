<template>
  <main
    class="startup-error"
    :lang="language"
    :dir="getLanguageTextDirection(language)"
    aria-labelledby="startup-error-title"
  >
    <div class="startup-error__card">
      <div class="startup-error__brand" aria-hidden="true">Agora</div>
      <h1 id="startup-error-title" ref="heading" tabindex="-1">
        {{ messages.title }}
      </h1>
      <p>{{ messages.description }}</p>
      <button type="button" @click="reload">{{ messages.reload }}</button>
    </div>
  </main>
</template>

<script setup lang="ts">
import { getLanguageTextDirection } from "src/shared/languages";
import { detectInitialDisplayLanguage } from "src/utils/language";
import { onMounted, useTemplateRef } from "vue";

import { startupErrorMessages } from "./StartupError.i18n";

// Storage restrictions can themselves cause boot failure; keep recovery usable.
function getStoredLanguage(): string | undefined {
  try {
    return localStorage.getItem("displayLanguage") ?? undefined;
  } catch {
    return undefined;
  }
}

const language =
  typeof navigator === "undefined"
    ? "en"
    : detectInitialDisplayLanguage({ storedLanguage: getStoredLanguage() });
const messages = startupErrorMessages[language];
const heading = useTemplateRef<HTMLHeadingElement>("heading");

function reload(): void {
  window.location.reload();
}

onMounted(() => {
  document.getElementById("app-loading")?.remove();
  heading.value?.focus({ preventScroll: true });
});
</script>

<style scoped lang="scss">
.startup-error {
  min-height: 100vh;
  min-height: 100dvh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: $app-background-color;
  color: $ink-darkest;
  text-align: center;
}

.startup-error__card {
  width: 100%;
  max-width: 440px;
  padding: 32px 24px;
  border: 1px solid $sky-light;
  border-radius: 24px;
  background: $color-background-default;
}

.startup-error__brand {
  margin-block-end: 24px;
  color: $primary;
  font-size: 24px;
  font-weight: 700;
}

.startup-error h1 {
  margin: 0;
  font-size: 24px;
  line-height: 1.3;
  font-weight: 700;
}

// The heading receives programmatic focus for announcement, not interaction.
.startup-error h1:focus {
  outline: none;
}

.startup-error p {
  margin-block: 16px 24px;
  color: $ink-light;
  line-height: 1.6;
}

.startup-error button {
  min-height: 44px;
  padding: 12px 24px;
  border: 0;
  border-radius: 16px;
  background: $primary;
  color: $color-background-default;
  font: inherit;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
}

.startup-error button:hover {
  background: $primary-dark;
}

.startup-error button:focus-visible {
  outline: 2px solid $primary;
  outline-offset: 4px;
}
</style>
