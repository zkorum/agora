<template>
  <q-card flat bordered class="settings-toggle-card">
    <q-card-section class="settings-toggle-card__content">
      <div>
        <strong>{{ label }}</strong>
        <span>{{ description }}</span>
      </div>
      <ZKSwitch v-model="enabled" :disable="disabled" :aria-label="label" />
    </q-card-section>
  </q-card>
</template>

<script setup lang="ts">
import ZKSwitch from "src/components/ui-library/ZKSwitch.vue";

defineProps<{
  description: string;
  disabled: boolean;
  label: string;
}>();

const enabled = defineModel<boolean>({ required: true });
</script>

<style scoped lang="scss">
.settings-toggle-card {
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
