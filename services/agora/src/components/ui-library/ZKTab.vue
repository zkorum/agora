<template>
  <component
    :is="to ? 'router-link' : 'button'"
    :to="to"
    class="tabStyle"
    :class="{
      highlightTab: isHighlighted,
      underlineTab: shouldUnderlineOnHighlight,
      activeTabUnderlineColor: isHighlighted && shouldUnderlineOnHighlight,
      inactiveTabUnderlineColor: !isHighlighted && shouldUnderlineOnHighlight,
    }"
    @click="handleClick"
  >
    <!--  TODO: proper icon color -->
    <!-- :color="isHighlighted ? 'primary' : '#7D7A85'" -->
    <q-spinner
      v-if="isLoading"
      :color="isHighlighted ? 'primary' : '#7D7A85'"
      size="1rem"
    />
    <ZKIcon
      v-else-if="iconCode !== undefined"
      :color="isHighlighted ? '#6b4eff' : '#7D7A85'"
      :name="iconCode"
      size="1rem"
    />
    <span v-if="text !== undefined" :style="{ paddingBottom: '3px' }">
      {{ text }}
    </span>
  </component>
</template>

<script setup lang="ts">
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
import type { RouteNamedMap } from "vue-router/auto-routes";

defineProps<{
  text?: string;
  iconCode?: string;
  isHighlighted: boolean;
  shouldUnderlineOnHighlight: boolean;
  isLoading?: boolean;
  to?: { name: keyof RouteNamedMap };
}>();

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

function handleClick(event: MouseEvent): void {
  emit("click", event);
}
</script>

<style lang="scss" scoped>
.tabStyle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  cursor: pointer;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  padding-top: 0.5rem;
  padding-bottom: 0.3rem;
  font-weight: var(--font-weight-medium);
  color: #7d7a85;
  user-select: none;
  text-decoration: none;
  background: none;
  border: none;
}

.highlightTab {
  color: transparent;
  background-image: $gradient-hero;
  -webkit-background-clip: text;
  background-clip: text;
}

.underlineTab {
  border-bottom: 3px solid;
}

.activeTabUnderlineColor {
  border-color: $primary;
}

.inactiveTabUnderlineColor {
  border-color: transparent;
}
</style>
