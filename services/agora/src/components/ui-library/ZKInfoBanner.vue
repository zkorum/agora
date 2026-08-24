<template>
  <div class="zk-info-banner" :class="`zk-info-banner--${variant}`">
    <ZKIcon
      :name="presentation.iconName"
      size="1.25rem"
      :color="presentation.iconColor"
    />
    <div class="banner-content">
      <span class="banner-text">{{ message }}</span>
      <PrimeButton
        v-if="actionLabel"
        :label="actionLabel"
        :severity="presentation.buttonSeverity"
        size="small"
        @click="emit('action')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import Button from "primevue/button";
import { computed } from "vue";

import ZKIcon from "./ZKIcon.vue";

defineOptions({
  components: {
    PrimeButton: Button,
  },
});

const props = withDefaults(defineProps<Props>(), {
  actionLabel: undefined,
  variant: "info",
});

const emit = defineEmits<{
  action: [];
}>();

export interface Props {
  message: string;
  actionLabel?: string;
  variant?: "error" | "info" | "warning";
}

type BannerVariant = NonNullable<Props["variant"]>;
const presentations = {
  error: {
    iconName: "mdi:alert-circle-outline",
    iconColor: "#d3180c",
    buttonSeverity: "danger",
  },
  info: {
    iconName: "mdi:information-outline",
    iconColor: "var(--p-blue-600)",
    buttonSeverity: "info",
  },
  warning: {
    iconName: "mdi:alert-outline",
    iconColor: "#8a5a00",
    buttonSeverity: "warn",
  },
} satisfies Record<
  BannerVariant,
  { iconName: string; iconColor: string; buttonSeverity: string }
>;
const presentation = computed(() => presentations[props.variant]);
</script>

<style scoped lang="scss">
.zk-info-banner {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.5rem;
  background-color: var(--p-blue-50);
  border: 1px solid var(--p-blue-200);
  border-radius: 8px;
}

.zk-info-banner--warning {
  background-color: #fff4df;
  border-color: #f3d59b;

  .banner-text {
    color: #8a5a00;
  }
}

.zk-info-banner--error {
  background-color: rgba($negative, 0.08);
  border-color: rgba($negative, 0.35);

  .banner-text {
    color: $negative;
    font-weight: 600;
  }
}

.banner-content {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  flex: 1;
}

.banner-text {
  flex: 1;
  color: var(--p-blue-900);
  font-size: 0.95rem;
}
</style>
