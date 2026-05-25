<template>
  <q-chip dense class="zk-chip" :class="`zk-chip--${color}`">
    <slot />
  </q-chip>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    color?: "neutral" | "primary" | "warning" | "muted";
  }>(),
  {
    color: "neutral",
  }
);
</script>

<style scoped lang="scss">
.zk-chip {
  width: fit-content;
  min-height: unset;
  margin: 0;
  padding: 0.12rem 0.45rem;
  font-size: 0.7rem;
  line-height: 1.3;
  white-space: nowrap;
}

.zk-chip--neutral {
  background: #f5f5f7;
  color: #6d6a74;
}

.zk-chip--primary {
  background: #eeeaff;
  color: #4d36d8;
}

.zk-chip--warning {
  background: #fff4df;
  color: #8a5a00;
}

.zk-chip--muted {
  background: #f2f2f4;
  color: #6d6a74;
}
</style>
