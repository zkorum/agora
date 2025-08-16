<template>
  <div class="settings-background">
    <PrimeIconField class="search-field">
      <PrimeInputIcon class="pi pi-search" />
      <PrimeInputText
        ref="inputRef"
        v-model="internalValue"
        :placeholder="placeholder"
        class="search-input"
        type="text"
      />
      <PrimeInputIcon
        v-if="modelValue"
        class="pi pi-times cursor-pointer clear-icon"
        @click="clearSearch"
      />
    </PrimeIconField>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

interface Props {
  modelValue: string;
  placeholder?: string;
}

interface Emits {
  (e: "update:modelValue", value: string): void;
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: "Search...",
});

const emit = defineEmits<Emits>();

const inputRef = ref<{ $el: HTMLInputElement } | null>(null);

const internalValue = computed({
  get() {
    return props.modelValue;
  },
  set(value: string) {
    emit("update:modelValue", value);
  },
});

function clearSearch(): void {
  emit("update:modelValue", "");
  inputRef.value?.$el?.focus();
}

function focus(): void {
  inputRef.value?.$el?.focus();
}

defineExpose({
  focus,
});
</script>

<style scoped lang="scss">
.settings-background {
  display: flex;
  flex-direction: column;
}

.search-field {
  padding: 1rem;
  border-radius: 20px;

  :deep(.p-inputtext) {
    width: 100%;
    border: none;
    outline: none;
    background: transparent;
    font-size: 16px;
    font-weight: 400;
    color: #1a1a1a;
    line-height: 1.4;
    box-shadow: none;

    &::placeholder {
      color: #666;
      font-weight: 400;
    }

    &:focus {
      box-shadow: none;
      border: none;
    }
  }

  :deep(.p-inputicon) {
    color: #666;

    &.pi-search {
      left: 0.75rem;
    }

    &.clear-icon {
      cursor: pointer;
      padding: 0.25rem;
      margin: -0.25rem;
      border-radius: 50%;
      transition: background-color 0.2s ease;
      right: 0.75rem;

      &:hover {
        background-color: rgba(0, 0, 0, 0.1);
      }
    }
  }

  :deep(.p-iconfield) {
    width: 100%;
  }
}
</style>
