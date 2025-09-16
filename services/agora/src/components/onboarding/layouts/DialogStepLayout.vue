<template>
  <div class="dialog-step">
    <div class="header">
      <div class="title">{{ t("welcomeTitle") }}</div>
      <div class="subtitle">{{ title }}</div>
    </div>

    <div class="content">
      <slot />
    </div>

    <div class="footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  dialogStepLayoutTranslations,
  type DialogStepLayoutTranslations,
} from "./DialogStepLayout.i18n";

interface Props {
  title: string;
}

defineProps<Props>();

const { t } = useComponentI18n<DialogStepLayoutTranslations>(
  dialogStepLayoutTranslations
);
</script>

<style scoped lang="scss">
.dialog-step {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
  min-height: 40vh;
  max-height: 70vh;
}

.header {
  text-align: center;
  margin-bottom: 1rem;
  flex-shrink: 0;
}

.title {
  font-size: 1.5rem;
  font-weight: var(--font-weight-bold);
  color: #1a1a1a;
  padding-bottom: 1rem;
}

.subtitle {
  font-size: 1rem;
}

.content {
  flex: 1;
  overflow-y: auto;
  padding-right: 0.25rem;
  margin-right: -0.25rem;
}

.footer {
  flex-shrink: 0;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(214, 214, 214);
}

// Mobile optimizations
@media (max-height: 600px) {
  .dialog-step {
    max-height: 60vh;
    min-height: 350px;
  }

  .title {
    font-size: 18px;
  }
}
</style>
