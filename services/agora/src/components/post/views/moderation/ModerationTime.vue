<template>
  <div>
    <div class="container">
      <div>
        {{ useDateFormat(createdAt, "HH:mm A") }}
      </div>
      <div>
        {{ useDateFormat(createdAt, "YYYY-MM-DD") }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDateFormat } from "@vueuse/core";

defineProps<{
  createdAt: Date;
}>();
</script>

<style lang="scss" scoped>
.container {
  display: flex;
  flex-direction: column;
  align-items: end;
}
</style>
