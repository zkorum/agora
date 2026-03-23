<template>
  <ActionButton variant="filled" class="start-conversation-button" @click="$emit('click')">
    <div class="plus-icon"></div>
    <span class="button-text">{{ t("buttonText") }}</span>
  </ActionButton>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";

import ActionButton from "../ui-library/ActionButton.vue";
import {
  type StartConversationButtonLongTranslations,
  startConversationButtonLongTranslations,
} from "./StartConversationButtonLong.i18n";

defineEmits<{
  click: [];
}>();

const { t } = useComponentI18n<StartConversationButtonLongTranslations>(
  startConversationButtonLongTranslations
);
</script>

<style lang="scss" scoped>
.start-conversation-button {
  width: 100%;
  gap: 8px;
}

.plus-icon {
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &::before,
  &::after {
    content: "";
    position: absolute;
    background: #ffffff;
  }

  &::before {
    width: 2px;
    height: 14px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  &::after {
    width: 14px;
    height: 2px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

.button-text {
  color: #ffffff;
  display: flex;
  align-items: center;
  flex: 1;
  text-align: left;
  white-space: nowrap;
}
</style>
