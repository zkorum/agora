<template>
  <div>
    <div>
      <slot />

      <q-page-sticky position="bottom-right" :offset="[30, 30]">
        <q-btn
          unelevated
          fab
          icon="mdi-plus"
          color="primary"
          @click="buttonClick()"
        />
      </q-page-sticky>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(["onClick"]);

function buttonClick() {
  emit("onClick");
}
</script>

<style scoped></style>
