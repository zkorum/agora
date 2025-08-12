<template>
  <div class="settings-background">
    <div class="search-item">
      <div class="search-item__left">
        <ZKIcon name="mdi-magnify" size="1.2rem" color="#666" />
      </div>

      <div class="search-item__center">
        <input
          ref="inputRef"
          v-model="internalValue"
          :placeholder="placeholder"
          class="search-input"
          type="text"
        />
      </div>

      <div v-if="modelValue" class="search-item__right">
        <ZKIcon
          name="mdi-close"
          size="1.2rem"
          color="#666"
          class="cursor-pointer"
          @click="clearSearch"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import ZKIcon from "src/components/ui-library/ZKIcon.vue";
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

const inputRef = ref<HTMLInputElement>();

const internalValue = computed({
  get() {
    return props.modelValue;
  },
  set(value: string) {
    emit("update:modelValue", value);
  },
});

function clearSearch() {
  emit("update:modelValue", "");
  inputRef.value?.focus();
}

function focus() {
  inputRef.value?.focus();
}

defineExpose({
  focus,
});
</script>

<style scoped lang="scss">
.settings-background {
  background-color: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
}

.search-item {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  font-weight: 500;
  padding: 1rem;
  border-radius: 20px;
}

.search-item__left {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.search-item__center {
  flex: 1;
  display: flex;
  align-items: center;
}

.search-item__right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  min-width: 1.2rem;
  justify-content: center;
}

.search-input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 16px;
  font-weight: 400;
  color: #1a1a1a;
  line-height: 1.4;

  &::placeholder {
    color: #666;
    font-weight: 400;
  }
}

.cursor-pointer {
  cursor: pointer;
  padding: 0.25rem;
  margin: -0.25rem;
  border-radius: 50%;
  transition: background-color 0.2s ease;

  &:hover {
    background-color: rgba(0, 0, 0, 0.1);
  }
}
</style>
