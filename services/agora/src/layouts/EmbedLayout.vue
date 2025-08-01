<template>
  <div class="embed-container">
    <WidthWrapper :enable="true">
      <div class="content-wrapper">
        <EmbedAccountWidget />
        <slot />
      </div>
    </WidthWrapper>
  </div>
</template>

<script setup lang="ts">
import EmbedAccountWidget from "src/components/account/EmbedAccountWidget.vue";
import WidthWrapper from "src/components/navigation/WidthWrapper.vue";
</script>

<style scoped lang="scss">
.embed-container {
  width: 100%;
  height: 100vh;
  overflow-y: auto;
  background-color: $app-background-color;
  padding: 0;
  margin: 0;
}

.content-wrapper {
  position: relative;
  min-height: 100vh;
}

// Remove any default margins/padding
:global(body) {
  margin: 0;
  padding: 0;
}
</style>
