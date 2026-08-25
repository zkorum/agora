<template>
  <q-card flat bordered class="global-pause-card">
    <q-card-section class="global-pause-card__content">
      <div>
        <strong>{{ title }}</strong>
        <span>{{ description }}</span>
      </div>
      <ZKSwitch
        :model-value="paused"
        :disable="saving"
        :aria-label="title"
        @update:model-value="emit('setPaused', $event)"
      />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";

defineProps<{
  description: string;
  paused: boolean;
  saving: boolean;
  title: string;
}>();

const emit = defineEmits<{
  setPaused: [paused: boolean];
}>();
</script>

<style scoped lang="scss">
.global-pause-card {
  overflow: hidden;
  border-color: rgba($primary, 0.28);
  border-radius: 1rem;
  background: rgba($primary, 0.035);

  &__content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;

    > div {
      display: grid;
      gap: 0.25rem;
    }

    span {
      color: $color-text-weak;
      font-size: 0.78rem;
      line-height: 1.4;
    }
  }
}
</style>
