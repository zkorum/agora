<template>
  <q-header :reveal="reveal" bordered class="menuStyle">
    <WidthWrapper :enable="true">
      <div class="topMenu">
        <slot />
      </div>
    </WidthWrapper>
  </q-header>
</template>

<script setup lang="ts">
import WidthWrapper from "./WidthWrapper.vue";

defineProps<{
  reveal: boolean;
}>();
</script>

<style scoped lang="scss">
.menuStyle {
  background-color: $navigation-bar-color;
}

.topMenu {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  height: 100%;
  padding-top: 0.5rem;
}
</style>
