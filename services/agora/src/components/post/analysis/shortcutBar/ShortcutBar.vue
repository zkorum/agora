<template>
  <div>
    <div class="container">
      <ShortcutButton
        v-for="item in shortcutItemList"
        :key="item"
        :is-selected="item === currentTab"
        :label="getTranslatedLabel(item)"
        @click="clickedShortcutButton(item)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useComponentI18n } from "src/composables/ui/useComponentI18n";
import type { ShortcutItem } from "src/utils/component/analysis/shortcutBar";

import {
  type ShortcutBarTranslations,
  shortcutBarTranslations,
} from "./ShortcutBar.i18n";
import ShortcutButton from "./ShortcutButton.vue";

const currentTab = defineModel<ShortcutItem>({ required: true });

const { t } = useComponentI18n<ShortcutBarTranslations>(
  shortcutBarTranslations
);

const shortcutItemList: ShortcutItem[] = [
  "Summary",
  "Me",
  "Groups",
  "Agreements",
  "Disagreements",
  "Divisive",
];

function getTranslatedLabel(item: ShortcutItem): string {
  const keyMap: Record<ShortcutItem, keyof ShortcutBarTranslations> = {
    Summary: "summary",
    Me: "me",
    Groups: "groups",
    Agreements: "agreements",
    Disagreements: "disagreements",
    Divisive: "divisive",
  };
  return t(keyMap[item]);
}

function clickedShortcutButton(shortcutName: ShortcutItem) {
  currentTab.value = shortcutName;
}
</script>

<style lang="postcss" scoped>
.container {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
}
</style>
