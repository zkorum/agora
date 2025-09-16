<template>
  <div>
    <!-- TODO: ACCESSIBILITY - Change <div> to <button> element for keyboard accessibility -->
    <!-- Footer navigation items should be keyboard accessible for users with motor disabilities -->
    <div class="menu-bar-container" @click="handleContainerClick">
      <TopMenuWrapper>
        <div class="menu-bar-grid" :class="{ 'force-center': centerContent }">
          <div v-if="$slots.left" class="left-section">
            <slot name="left"></slot>
          </div>

          <div v-if="$slots.middle" class="center-section">
            <slot name="middle"></slot>
          </div>

          <div v-if="$slots.right" class="right-section">
            <slot name="right"></slot>
          </div>
        </div>
      </TopMenuWrapper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { type DefaultMenuBarProps } from "src/utils/model/props";
import TopMenuWrapper from "./TopMenuWrapper.vue";

const props = withDefaults(defineProps<DefaultMenuBarProps>(), {
  clickToScrollTop: true,
  centerContent: false,
});

function handleContainerClick(): void {
  if (props.clickToScrollTop) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}
</script>

<style scoped lang="scss">
.menu-bar-container {
  padding: 0.5rem;

  &:hover {
    cursor: pointer;
  }
}

.menu-bar-grid {
  display: flex;
  align-items: center;
  width: 100%;
  gap: 1rem;

  .left-section,
  .right-section {
    flex: 1;
    display: flex;
    align-items: center;
  }

  .left-section {
    justify-content: flex-start;
    gap: 1rem;
  }

  .right-section {
    justify-content: flex-end;
  }

  .center-section {
    flex: 0 0 auto;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: var(--font-weight-medium);
    font-size: 1rem;
    color: black;
  }

  // Perfect centering option
  &.force-center {
    position: relative;

    .center-section {
      position: absolute;
      left: 50%;
      top: 50%;
      transform: translate(-50%, -50%);
      white-space: nowrap; // Prevent text wrapping when absolutely positioned
    }
  }
}

// Global style for menu button hover (if used in slots)
:deep(.menu-button-hover:hover) {
  cursor: pointer;
}
</style>
