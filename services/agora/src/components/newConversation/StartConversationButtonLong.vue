<template>
  <button
    class="start-conversation-button"
    type="button"
    @click="$emit('click')"
  >
    <div class="plus-icon"></div>
    <span class="button-text">{{ t("buttonText") }}</span>
  </button>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/useComponentI18n";
import {
  startConversationButtonLongTranslations,
  type StartConversationButtonLongTranslations,
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
  display: flex;
  flex-direction: row;
  align-items: center;
  padding: 12px 16px;
  gap: 8px;

  /* Dimensions */
  width: 227px;
  height: 48px;

  /* Gradient background from Figma */
  background: linear-gradient(180deg, #6b4eff 30.96%, #4f92f6 99.99%);
  border-radius: 16px;
  border: none;

  /* Interaction */
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  outline: none;

  /* Center the button content when used in containers */
  margin: 0 auto;

  &:hover {
    background: linear-gradient(180deg, #5a42d9 30.96%, #4282d6 99.99%);
  }

  &:active {
    transform: translateY(0);
    box-shadow: 0 4px 12px rgba(107, 78, 255, 0.3);
  }

  &:focus-visible {
    box-shadow:
      0 4px 12px rgba(107, 78, 255, 0.3),
      0 0 0 3px rgba(107, 78, 255, 0.3);
  }
}

.plus-icon {
  /* Icon container */
  width: 24px;
  height: 24px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  /* Create plus icon using CSS gradients */
  &::before,
  &::after {
    content: "";
    position: absolute;
    background: linear-gradient(0deg, #ffffff 0%, #ffffff 100%);
  }

  /* Vertical line of the plus */
  &::before {
    width: 2px;
    height: 14px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }

  /* Horizontal line of the plus */
  &::after {
    width: 14px;
    height: 2px;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
}

.button-text {
  /* Typography inspired by Figma design */
  font-family:
    "Albert Sans",
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  font-style: normal;
  font-weight: 500;
  font-size: 18px;
  line-height: 24px;
  letter-spacing: -0.01em;
  color: #ffffff;

  /* Layout */
  display: flex;
  align-items: center;
  white-space: nowrap;
  flex-shrink: 0;
}
</style>
